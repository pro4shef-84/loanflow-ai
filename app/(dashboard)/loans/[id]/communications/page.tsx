"use client";

import { use } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { MessageLog } from "@/components/communications/MessageLog";
import { MessageComposer } from "@/components/communications/MessageComposer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { Database } from "@/lib/types/database.types";

type Message = Database["public"]["Tables"]["messages"]["Row"];

export default function CommunicationsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const supabase = createClient();
  const queryClient = useQueryClient();

  const { data: messages } = useQuery({
    queryKey: ["messages", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("loan_file_id", id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Message[];
    },
  });

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/loans/${id}`}><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-xl font-bold">Communications</h1>
          <p className="text-muted-foreground text-sm">Messages and notifications</p>
        </div>
      </div>

      <Tabs defaultValue="log">
        <TabsList>
          <TabsTrigger value="log">Message Log ({messages?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="compose">Compose</TabsTrigger>
        </TabsList>

        <TabsContent value="log" className="mt-4">
          <MessageLog messages={messages ?? []} />
        </TabsContent>

        <TabsContent value="compose" className="mt-4">
          <Card>
            <CardHeader><CardTitle>Send Message</CardTitle></CardHeader>
            <CardContent>
              <MessageComposer
                loanFileId={id}
                onSent={() => queryClient.invalidateQueries({ queryKey: ["messages", id] })}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
