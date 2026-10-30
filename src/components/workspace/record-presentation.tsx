"use client";

import Link from "next/link";
import { Fragment, type ReactNode } from "react";
import { Ellipsis } from "lucide-react";

import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import styles from "./record-presentation.module.css";

export function WorkspaceRecordHeading({ title, status, actions, children }: {
  title: string;
  status?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
}) {
  return <header className="flex min-w-0 flex-col gap-4">
    <div className={styles.heading}>
      <div className="min-w-0 flex-1"><h1 className="workspace-page-title font-heading font-heading-1">{title}</h1>{status}</div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
    {children}
  </header>;
}

/** Callers supply real ancestry; presentation never interprets feature URLs. */
export function WorkspaceRecordBreadcrumbs({ ancestors, currentLabel }: {
  ancestors: readonly { label: string; href: string }[];
  currentLabel: string;
}) {
  const earlier = ancestors.slice(0, -1);
  return <Breadcrumb><BreadcrumbList>
    {earlier.length ? <>
      <BreadcrumbItem className={styles.compact}>
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Show ancestors" />}><Ellipsis aria-hidden="true" /></DropdownMenuTrigger>
          <DropdownMenuContent className="max-w-[min(28rem,90vw)] w-auto"><DropdownMenuGroup>
            {earlier.map(({ label, href }) => <DropdownMenuItem key={href} render={<Link href={href} />} className="whitespace-normal wrap-anywhere">{label}</DropdownMenuItem>)}
          </DropdownMenuGroup></DropdownMenuContent>
        </DropdownMenu>
      </BreadcrumbItem>
      <BreadcrumbSeparator className={styles.compact} />
    </> : null}
    {ancestors.map(({ label, href }, index) => <Fragment key={href}>
      <BreadcrumbItem className={index < ancestors.length - 1 ? styles.wide : "min-w-0 max-w-full"}>
        <BreadcrumbLink render={<Link href={href} />} className="wrap-anywhere">{label}</BreadcrumbLink>
      </BreadcrumbItem>
      <BreadcrumbSeparator className={index < ancestors.length - 1 ? styles.wide : undefined} />
    </Fragment>)}
    <BreadcrumbItem className="min-w-0 max-w-full"><BreadcrumbPage className="wrap-anywhere">{currentLabel}</BreadcrumbPage></BreadcrumbItem>
  </BreadcrumbList></Breadcrumb>;
}
