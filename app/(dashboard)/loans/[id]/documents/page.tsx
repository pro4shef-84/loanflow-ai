"use client";

import { use, useState } from "react";
import { useLoan } from "@/hooks/useLoans";
import { useDocuments } from "@/hooks/useDocuments";
import { DocumentChecklist } from "@/components/documents/DocumentChecklist";
import { DocumentUploader } from "@/components/documents/DocumentUploader";
import { DocumentCard } from "@/components/documents/DocumentCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { DocumentType } from "@/lib/types/loan.types";
import { useQueryClient } from "@tanstack/react-query";

export default function DocumentsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: loan } = useLoan(id);
  const { data: documents } = useDocuments(id);
  const queryClient = useQueryClient();
  const [uploadType, setUploadType] = useState<DocumentType | null>(null);

  const handleUploadType = (type: DocumentType) => setUploadType(type);

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/loans/${id}`}><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-xl font-bold">Documents</h1>
          <p className="text-muted-foreground text-sm">Manage loan documents</p>
        </div>
      </div>

      <Tabs defaultValue="checklist">
        <TabsList>
          <TabsTrigger value="checklist">Checklist</TabsTrigger>
          <TabsTrigger value="all">All Documents ({documents?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="upload">Upload</TabsTrigger>
        </TabsList>

        <TabsContent value="checklist" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              {loan ? (
                <DocumentChecklist
                  loanType={loan.loan_type}
                  documents={documents ?? []}
                  onUpload={handleUploadType}
                />
              ) : (
                <p className="text-muted-foreground">Loading...</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="all" className="mt-4">
          <div className="space-y-3">
            {documents?.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No documents uploaded yet.
                </CardContent>
              </Card>
            ) : (
              documents?.map((doc) => (
                <DocumentCard key={doc.id} document={doc} />
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="upload" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Upload Document</CardTitle>
            </CardHeader>
            <CardContent>
              <DocumentUploader
                loanFileId={id}
                documentType={uploadType ?? undefined}
                onUploadComplete={() => {
                  queryClient.invalidateQueries({ queryKey: ["documents", id] });
                  setUploadType(null);
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
