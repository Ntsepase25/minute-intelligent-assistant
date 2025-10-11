"use client";

import { ChevronRight, type LucideIcon, Loader2 } from "lucide-react";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import { SidebarLoadingSkeleton } from "./dashboard/loadingSidebar";
import { recording, sidebarItem } from "@/lib/types";
import { useRecordingsStore } from "@/stores/recordingsStore";
import { getRecordingDisplayTitle, isRecordingProcessing } from "@/utils/recordingHelpers";

export function NavMain({
  items,
  loading,
}: {
  items: {
    title: string;
    url: string;
    icon?: LucideIcon;
    isActive?: boolean;
    items?: recording[];
  }[];
  loading?: boolean;
}) {
  const { selectedRecording, setSelectedRecording } = useRecordingsStore();
  
  // Use the items passed from parent (which now come from React Query)
  const navItems = items;

  // console.log("NavMain items: ", navItems);
  return (
    <SidebarGroup>
      <SidebarGroupLabel>Platform</SidebarGroupLabel>
      <SidebarMenu>
        {loading ? (
          <SidebarLoadingSkeleton />
        ) : (
          navItems.map((item) => (
            <Collapsible
              key={item.title}
              asChild
              defaultOpen={item.isActive}
              className="group/collapsible"
            >
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton tooltip={item.title}>
                    {item.icon && <item.icon />}
                    <span>{item.title}</span>
                    <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub>
                    {item.items && item.items.length > 0 ? (
                      item.items?.map((subItem) => {
                        const displayTitle = getRecordingDisplayTitle(subItem);
                        const isProcessing = isRecordingProcessing(subItem);
                        
                        return (
                          <SidebarMenuSubItem
                            key={subItem.id}
                            className={
                              subItem.id === selectedRecording?.id
                                ? "bg-accent rounded"
                                : ""
                            }
                          >
                            <SidebarMenuSubButton
                              asChild
                              className="cursor-pointer"
                              onClick={() => setSelectedRecording(subItem)}
                            >
                              <span className="flex items-center gap-2 truncate">
                                {isProcessing && (
                                  <Loader2 className="h-3 w-3 animate-spin flex-shrink-0" />
                                )}
                                <span className="truncate">
                                  {displayTitle.substring(0, 25)}
                                  {displayTitle.length > 25 && "..."}
                                </span>
                              </span>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        );
                      })
                    ) : (
                      <div className="p-2 text-sm text-muted-foreground">
                        No recordings available
                      </div>
                    )}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>
          ))
        )}
      </SidebarMenu>
    </SidebarGroup>
  );
}
