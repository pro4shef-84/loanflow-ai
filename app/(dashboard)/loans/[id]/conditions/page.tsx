"use client";

import { use } from "react";
import { useConditions, useUpdateCondition } from "@/hooks/useConditions";
import { ConditionList } from "@/components/conditions/ConditionList";
import { ConditionParser } from "@/components/conditions/ConditionParser";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import type { Database } from "@/lib/types/database.types";

type Condition = Database["public"]["Tables"]["conditions"]["Row"];

export default function ConditionsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: conditions } = useConditions(id);
  const updateCondition = useUpdateCondition(id);
  const queryClient = useQueryClient();

  const handleStatusChange = (conditionId: string, status: Condition["status"]) => {
    updateCondition.mutate({ id: conditionId, updates: { status } });
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/loans/${id}`}><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-xl font-bold">Conditions</h1>
          <p className="text-muted-foreground text-sm">Track lender conditions</p>
        </div>
      </div>

      <Tabs defaultValue="conditions">
        <TabsList>
          <TabsTrigger value="conditions">Conditions ({conditions?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="parse">Parse New</TabsTrigger>
        </TabsList>

        <TabsContent value="conditions" className="mt-4">
          <ConditionList
            conditions={conditions ?? []}
            onStatusChange={handleStatusChange}
          />
        </TabsContent>

        <TabsContent value="parse" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Parse Lender Condition Letter</CardTitle>
            </CardHeader>
            <CardContent>
              <ConditionParser
                loanFileId={id}
                onParsed={() => {
                  queryClient.invalidateQueries({ queryKey: ["conditions", id] });
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
