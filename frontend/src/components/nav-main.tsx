"use client";

import { ChevronRight, type LucideIcon } from "lucide-react";

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
import { useSelectedRecordingStore } from "@/stores/recordingsStore";

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
  const selectedRecording = useSelectedRecordingStore(
    (state) => state.selectedRecording
  );

  const setSelectedRecording = useSelectedRecordingStore(
    (state) => state.setSelectedRecording
  );
  console.log("NavMain items: ", items);
  return (
    <SidebarGroup>
      <SidebarGroupLabel>Platform</SidebarGroupLabel>
      <SidebarMenu>
        {loading ? (
          <SidebarLoadingSkeleton />
        ) : (
          items.map((item) => (
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
                      item.items?.map((subItem) => (
                        <SidebarMenuSubItem
                          key={subItem.id}
                          className={
                            subItem.id === selectedRecording.id
                              ? "bg-accent rounded"
                              : ""
                          }
                        >
                          <SidebarMenuSubButton
                            asChild
                            className="cursor-pointer"
                            onClick={() => setSelectedRecording(subItem)}
                          >
                            {/* <a href={subItem.url}> */}
                            <span>{subItem.title || subItem.meetingId}</span>
                            {/* </a> */}
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))
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
