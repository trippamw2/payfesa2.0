import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface TaskItemProps {
  id: string;
  text: string;
  completed: boolean;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}

export const TaskItem = ({ id, text, completed, onToggle, onDelete }: TaskItemProps) => {
  return (
    <div className="group flex items-center gap-3 p-4 bg-card rounded-lg border border-border shadow-[var(--shadow-soft)] hover:shadow-[var(--shadow-medium)] transition-all duration-200">
      <Checkbox
        id={id}
        checked={completed}
        onCheckedChange={() => onToggle(id)}
        className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
      />
      <label
        htmlFor={id}
        className={cn(
          "flex-1 text-base cursor-pointer transition-all duration-200",
          completed && "line-through text-muted-foreground"
        )}
      >
        {text}
      </label>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onDelete(id)}
        className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-destructive/10 hover:text-destructive"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
};
