import { User } from "better-auth";
import { Avatar, AvatarImage, AvatarFallback } from "../ui/avatar";
import React from "react";
import { Loader2 } from "lucide-react";
import { Button } from "../ui/button";

type Props = {
  session?: User;
  isPending: boolean;
};

const Header = ({ session, isPending }: Props) => {
  return (
    <div className="flex w-full justify-between px-4 border-b mt-4">
      <h1 className="text-2xl font-bold flex items-center justify-center">
        MIA
      </h1>
      <div className="flex items-center gap-2">
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin text-purple-500" />
        ) : (
          <div className="p-2">
            {session ? (
              <Avatar>
                <AvatarImage
                  src={session.image || ""}
                  alt={session.name || "User Avatar"}
                />
                <AvatarFallback>
                  {session.name ? session.name.charAt(0) : "U"}
                </AvatarFallback>
              </Avatar>
            ) : (
              <Button className="bg-purple-500 hover:bg-purple-600" asChild>
                <a href="/sign-in">Login</a>
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Header;
