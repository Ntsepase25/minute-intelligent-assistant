import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, User, Calendar } from "lucide-react";
import { ActionItem } from "@/lib/types";

interface ActionItemsProps {
  actionItems: ActionItem[] | null;
}

export default function ActionItems({ actionItems }: ActionItemsProps) {
  const [completedItems, setCompletedItems] = useState<Set<number>>(new Set());

  const toggleComplete = (index: number) => {
    const newCompleted = new Set(completedItems);
    if (newCompleted.has(index)) {
      newCompleted.delete(index);
    } else {
      newCompleted.add(index);
    }
    setCompletedItems(newCompleted);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-300 dark:border-yellow-800";
      case "low":
        return "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/20 dark:text-gray-300 dark:border-gray-800";
    }
  };

  if (!actionItems || actionItems.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            Action Items
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No action items identified in this meeting.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <CheckCircle2 className="h-4 w-4 text-primary" />
          Action Items ({actionItems.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {actionItems.map((item, index) => (
          <div
            key={index}
            className={`border rounded-lg p-3 transition-colors ${
              completedItems.has(index)
                ? "bg-muted/50 opacity-75"
                : "bg-background"
            }`}
          >
            <div className="flex items-start gap-3">
              <button
                onClick={() => toggleComplete(index)}
                className={`mt-0.5 h-4 w-4 rounded-full border-2 flex items-center justify-center transition-colors ${
                  completedItems.has(index)
                    ? "bg-primary border-primary text-primary-foreground"
                    : "border-muted-foreground hover:border-primary"
                }`}
              >
                {completedItems.has(index) && (
                  <CheckCircle2 className="h-3 w-3" />
                )}
              </button>
              <div className="flex-1 space-y-2">
                <p
                  className={`text-sm font-medium ${
                    completedItems.has(index)
                      ? "line-through text-muted-foreground"
                      : ""
                  }`}
                >
                  {item.task}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    variant="outline"
                    className={`text-xs ${getPriorityColor(item.priority)}`}
                  >
                    {item.priority.toUpperCase()}
                  </Badge>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <User className="h-3 w-3" />
                    {item.assignee}
                  </div>
                  {item.deadline && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {item.deadline}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
