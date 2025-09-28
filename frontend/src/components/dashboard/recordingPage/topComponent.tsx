import React from "react";
import { Button } from "../../ui/button";
import { RefreshCcw, Trash2 } from "lucide-react";

const TopComponent = () => {
  return (
    <div className="flex md:flex-row flex-col gap-2 justify-between mx-2">
      <div className="flex flex-col">
        <div className="text-xl font-bold">MIA Progress Meeting</div>
        <div className="text-muted-foreground text-sm">
          Recording and Minutes
        </div>
      </div>
      <div className="flex gap-2 items-center">
        <Button variant="outline">
          <RefreshCcw className="h-4 w-4 " />
          Regenerate
        </Button>
        <Button variant="destructive">
          <Trash2 className="h-4 w-4 " />
          Delete
        </Button>
      </div>
    </div>
  );
};

export default TopComponent;
