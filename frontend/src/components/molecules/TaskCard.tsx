import { CalendarClock, UserCircle } from "lucide-react";

import { StatusPill } from "@/components/atoms/StatusPill";
import { Card, CardContent } from "@/components/ui/card";

interface TaskCardProps {
  title: string;
  status: string;
  assignee?: string;
  due?: string;
}

export function TaskCard({ title, status, assignee, due }: TaskCardProps) {
  return (
    <Card className="border border-[color:var(--border)] bg-[color:var(--surface)]">
      <CardContent className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2">
            <p className="text-sm font-semibold text-strong">{title}</p>
            <StatusPill status={status} />
          </div>
        </div>
        <div className="flex items-center justify-between text-xs text-muted">
          <div className="flex items-center gap-2">
            <UserCircle className="h-4 w-4" />
            <span>{assignee ?? "Unassigned"}</span>
          </div>
          {due ? (
            <div className="flex items-center gap-2">
              <CalendarClock className="h-4 w-4" />
              <span>{due}</span>
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
