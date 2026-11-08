#define MasanaoId "{04D0DD84-C47A-42C0-BE6D-F134E2AD10D7}"

[Setup]
AppId={{#MasanaoId}
AppName=Masanao
AppVersion={#AppVersion}
DefaultDirName={localappdata}\Programs\Masanao
DefaultGroupName=Masanao
DisableProgramGroupPage=yes
DisableDirPage=yes
AllowNoIcons=yes
PrivilegesRequired=lowest
ArchitecturesAllowed=x64os
ArchitecturesInstallIn64BitMode=x64os
SetupMutex=MasanaoWindowsSetup
CloseApplications=no
OutputBaseFilename=Masanao-Setup-{#AppVersion}-x64
Compression=lzma2/fast
SolidCompression=yes
WizardStyle=modern

[Tasks]
Name: "desktopicon"; Description: "Create a desktop shortcut"

[Files]
Source: "{#PayloadDir}\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[InstallDelete]
Type: filesandordirs; Name: "{app}\.next-build-windows"
Type: filesandordirs; Name: "{app}\node_modules"
Type: filesandordirs; Name: "{app}\public"
Type: filesandordirs; Name: "{app}\src\prisma\migrations"

[Icons]
Name: "{group}\Masanao"; Filename: "{app}\scripts\windows\start.cmd"; WorkingDir: "{app}"; Flags: runminimized
Name: "{group}\Stop Masanao"; Filename: "{app}\node.exe"; Parameters: """{app}\scripts\windows\launcher.mjs"" stop"; WorkingDir: "{app}"; Flags: runminimized
Name: "{group}\Set up first administrator"; Filename: "{sys}\WindowsPowerShell\v1.0\powershell.exe"; Parameters: "-NoProfile -ExecutionPolicy RemoteSigned -File ""{app}\scripts\windows\create-admin.ps1"""; WorkingDir: "{app}"
Name: "{userdesktop}\Masanao"; Filename: "{app}\scripts\windows\start.cmd"; WorkingDir: "{app}"; Flags: runminimized; Tasks: desktopicon

[Code]
var
  OwnsUpdateMarker: Boolean;

function HasDirectoryEntries(const Directory: String): Boolean;
var
  Entry: TFindRec;
begin
  Result := False;
  if FindFirst(AddBackslash(Directory) + '*', Entry) then begin
    try
      repeat
        Result := (Entry.Name <> '.') and (Entry.Name <> '..');
      until Result or not FindNext(Entry);
    finally
      FindClose(Entry);
    end;
  end;
end;

function IsReparsePoint(const Path: String): Boolean;
var
  Entry: TFindRec;
begin
  Result := False;
  if FindFirst(Path, Entry) then begin
    Result := (Entry.Attributes and FILE_ATTRIBUTE_REPARSE_POINT) <> 0;
    FindClose(Entry);
  end;
end;

function SafeInstallDirectory(const Directory: String): Boolean;
var
  Parent, Path, Registered: String;
begin
  Result := False;
  Path := Directory;
  while Path <> '' do begin
    if IsReparsePoint(Path) then Exit;
    Parent := RemoveBackslashUnlessRoot(ExtractFileDir(Path));
    if Parent = Path then Break;
    Path := Parent;
  end;
  if IsReparsePoint(Directory + '\.next-build-windows') or
     IsReparsePoint(Directory + '\node_modules') or IsReparsePoint(Directory + '\public') or
     IsReparsePoint(Directory + '\src') or IsReparsePoint(Directory + '\src\prisma') or
     IsReparsePoint(Directory + '\src\prisma\migrations') then Exit;
  if RegQueryStringValue(HKCU, 'Software\Microsoft\Windows\CurrentVersion\Uninstall\{#MasanaoId}_is1', 'InstallLocation', Registered) then
    Result := CompareText(RemoveBackslashUnlessRoot(ExpandFileName(Registered)), Directory) = 0
  else
    Result := not HasDirectoryEntries(Directory);
end;

function StopForMaintenance(): Boolean;
var
  Node, StopScript: String;
  ExitCode: Integer;
begin
  Result := False;
  if not ForceDirectories(ExpandConstant('{app}')) then Exit;
  OwnsUpdateMarker := SaveStringToFile(ExpandConstant('{app}\updating'), '', False);
  if not OwnsUpdateMarker then Exit;
  Node := ExpandConstant('{app}\node.exe');
  if not FileExists(Node) then begin
    Result := True;
    Exit;
  end;
  // Use only Node's built-ins so repair can stop an older copy even if its launcher or packages are damaged.
  StopScript :=
    'const path=require(''node:path'').join(process.env.LOCALAPPDATA,''Masanao'',''Data'');' +
    'const id=require(''node:crypto'').createHash(''sha256'').update(path.toLowerCase()).digest(''hex'');' +
    'const slash=String.fromCharCode(92);' +
    'const pipe=require(''node:net'').createConnection(slash+slash+''.''+slash+''pipe''+slash+''Masanao-''+id);' +
    'let reply='''';pipe.setEncoding(''utf8'');pipe.once(''connect'',()=>pipe.write(''stop''));' +
    'pipe.on(''data'',chunk=>reply+=chunk);pipe.once(''end'',()=>{if(reply!==''ok'')process.exitCode=1;});' +
    'pipe.once(''error'',error=>{if(error.code!==''ENOENT'')process.exitCode=1;});' +
    'pipe.setTimeout(65000,()=>{process.exitCode=1;pipe.destroy();});';
  Result := Exec(Node, '--eval "' + StopScript + '"', ExpandConstant('{app}'), SW_HIDE, ewWaitUntilTerminated, ExitCode) and (ExitCode = 0);
end;

function PrepareToInstall(var NeedsRestart: Boolean): String;
var
  Directory: String;
begin
  Result := '';
  Directory := RemoveBackslashUnlessRoot(ExpandFileName(ExpandConstant('{app}')));
  if not SafeInstallDirectory(Directory) then begin
    Result := 'Choose an empty folder or use the existing registered Masanao installation folder.';
    Exit;
  end;
  if not StopForMaintenance() then
    Result := 'Could not stop Masanao. Close Masanao and its setup window, then try again.';
end;

function InitializeUninstall(): Boolean;
begin
  Result := StopForMaintenance();
  if not Result then
    MsgBox('Could not stop Masanao. Close Masanao and its setup window, then try again.', mbError, MB_OK);
end;

procedure ClearUpdateMarker();
begin
  if OwnsUpdateMarker then begin
    DeleteFile(ExpandConstant('{app}\updating'));
    OwnsUpdateMarker := False;
  end;
end;

procedure DeinitializeSetup();
begin
  ClearUpdateMarker();
end;

procedure DeinitializeUninstall();
begin
  ClearUpdateMarker();
  RemoveDir(ExpandConstant('{app}'));
end;
