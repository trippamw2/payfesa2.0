import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { TaskItem } from "@/components/TaskItem";
import { Plus, CheckCircle2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Task {
  id: string;
  text: string;
  completed: boolean;
}

const Index = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [inputValue, setInputValue] = useState("");

  const addTask = () => {
    if (inputValue.trim() === "") {
      toast({
        title: "Empty task",
        description: "Please enter a task description",
        variant: "destructive",
      });
      return;
    }

    const newTask: Task = {
      id: Date.now().toString(),
      text: inputValue.trim(),
      completed: false,
    };

    setTasks([newTask, ...tasks]);
    setInputValue("");
    toast({
      title: "Task added",
      description: "Your task has been added successfully",
    });
  };

  const toggleTask = (id: string) => {
    setTasks(
      tasks.map((task) =>
        task.id === id ? { ...task, completed: !task.completed } : task
      )
    );
  };

  const deleteTask = (id: string) => {
    setTasks(tasks.filter((task) => task.id !== id));
    toast({
      title: "Task deleted",
      description: "Your task has been removed",
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      addTask();
    }
  };

  const completedCount = tasks.filter((task) => task.completed).length;
  const totalCount = tasks.length;

  return (
    <div className="min-h-screen bg-[image:var(--gradient-bg)] flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-2 flex items-center justify-center gap-2">
            <CheckCircle2 className="h-10 w-10 text-primary" />
            To-Do List
          </h1>
          <p className="text-muted-foreground">Stay organized and productive</p>
        </div>

        <div className="bg-card rounded-xl shadow-[var(--shadow-medium)] p-6 mb-6 border border-border">
          <div className="flex gap-2 mb-4">
            <Input
              type="text"
              placeholder="Add a new task..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-1 bg-background border-input focus-visible:ring-primary"
            />
            <Button
              onClick={addTask}
              className="bg-primary hover:bg-accent text-primary-foreground"
            >
              <Plus className="h-5 w-5" />
            </Button>
          </div>

          {totalCount > 0 && (
            <div className="text-sm text-muted-foreground mb-4 px-1">
              {completedCount} of {totalCount} completed
            </div>
          )}
        </div>

        <div className="space-y-3">
          {tasks.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-lg">No tasks yet</p>
              <p className="text-sm">Add your first task to get started!</p>
            </div>
          ) : (
            tasks.map((task) => (
              <TaskItem
                key={task.id}
                {...task}
                onToggle={toggleTask}
                onDelete={deleteTask}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Index;
