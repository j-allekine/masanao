using System;
using System.Diagnostics;
using System.IO;
using System.Text;
using System.Windows.Forms;

// A GUI-subsystem executable keeps the local server and its children console-free.
internal static class Masanao
{
    [STAThread]
    private static int Main(string[] args)
    {
        string command = args.Length == 0 ? "start" : args[0];
        bool testing = command == "start-test";
        string logPath = null;
        try
        {
            if (args.Length > 1 || (command != "start" && command != "stop" && !testing))
                throw new ArgumentException("Unknown Masanao command.");

            string root = AppDomain.CurrentDomain.BaseDirectory;
            string logs = Path.Combine(Environment.GetEnvironmentVariable("LOCALAPPDATA") ?? Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Masanao", "Data", "logs");
            Directory.CreateDirectory(logs);
            logPath = Path.Combine(logs, "launcher-" + DateTime.UtcNow.ToString("yyyyMMddTHHmmssfff") + "-" + Process.GetCurrentProcess().Id + ".log");
            using (var log = new StreamWriter(logPath, false, new UTF8Encoding(false)))
            using (var process = new Process())
            {
                log.AutoFlush = true;
                var outputLock = new object();
                var errors = new StringBuilder();
                process.StartInfo = new ProcessStartInfo
                {
                    FileName = Path.Combine(root, "node.exe"),
                    Arguments = "\"" + Path.Combine(root, "scripts", "windows", "launcher.mjs") + "\" " + command,
                    WorkingDirectory = root,
                    UseShellExecute = false,
                    CreateNoWindow = true,
                    RedirectStandardOutput = true,
                    RedirectStandardError = true,
                    StandardOutputEncoding = Encoding.UTF8,
                    StandardErrorEncoding = Encoding.UTF8
                };
                process.OutputDataReceived += (sender, e) => {
                    if (e.Data != null) lock (outputLock) log.WriteLine(e.Data);
                };
                process.ErrorDataReceived += (sender, e) => {
                    if (e.Data != null) lock (outputLock) {
                        log.WriteLine(e.Data);
                        errors.AppendLine(e.Data);
                        if (errors.Length > 2000) errors.Remove(0, errors.Length - 2000);
                    }
                };
                process.Start();
                process.BeginOutputReadLine();
                process.BeginErrorReadLine();
                process.WaitForExit();
                if (process.ExitCode != 0 && !testing)
                    MessageBox.Show("Masanao could not complete the request.\n\n" + errors.ToString().Trim() + "\n\nLog: " + logPath,
                        "Masanao", MessageBoxButtons.OK, MessageBoxIcon.Error);
                return process.ExitCode;
            }
        }
        catch (Exception error)
        {
            if (!testing) MessageBox.Show(error.Message + (logPath == null ? "" : "\n\nLog: " + logPath),
                "Masanao", MessageBoxButtons.OK, MessageBoxIcon.Error);
            return 1;
        }
    }
}
