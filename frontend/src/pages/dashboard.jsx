import React from "react";
import { authClient } from "../lib/auth-client";
import { Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";

const DashBoard = () => {
  const { data: session, isPending } = authClient.useSession();

  if (isPending) {
    return (
      <div className="w-full h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="w-full h-screen flex items-center justify-center">
        Not signed in
      </div>
    );
  }
  return (
    <div className="w-full h-screen flex flex-col items-center justify-center gap-2">
      <Avatar>
        <AvatarImage src={session.user.image} />
        <AvatarFallback>{session.user.name?.charAt(0)}</AvatarFallback>
      </Avatar>
      <p className="text-2xl font-bold">{session.user.name}</p>
    </div>
  );
};

export default DashBoard;
