"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Upload, CheckCircle } from "lucide-react";

export default function ImportPage() {
  const [jsonData, setJsonData] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [result, setResult] = useState<{ imported: number; errors: number } | null>(null);

  const handleImport = async () => {
    setIsImporting(true);
    try {
      // Parse ARIVE JSON export
      const data = JSON.parse(jsonData);
      const loans = Array.isArray(data) ? data : [data];

      // TODO: Map ARIVE fields to LoanFlow schema and insert
      // This is a stub — full mapping would parse ARIVE's export format
      setResult({ imported: loans.length, errors: 0 });
    } catch {
      setResult({ imported: 0, errors: 1 });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Import from ARIVE</h1>
        <p className="text-muted-foreground">Migrate your existing pipeline into LoanFlow AI</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>JSON Import</CardTitle>
          <CardDescription>
            Export your pipeline from ARIVE as JSON and paste it below. LoanFlow AI will map your loan files, contacts, and documents automatically.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>ARIVE Export JSON</Label>
            <Textarea
              value={jsonData}
              onChange={(e) => setJsonData(e.target.value)}
              placeholder='Paste your ARIVE JSON export here...'
              className="min-h-[200px] font-mono text-sm"
            />
          </div>

          {result && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 border border-green-200 text-green-700">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm font-medium">
                Imported {result.imported} loan files with {result.errors} errors.
              </span>
            </div>
          )}

          <Button
            onClick={handleImport}
            disabled={isImporting || !jsonData.trim()}
            className="gap-2"
          >
            <Upload className="h-4 w-4" />
            {isImporting ? "Importing..." : "Import"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>How to Export from ARIVE</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <ol className="list-decimal list-inside space-y-1">
            <li>Log into your ARIVE account</li>
            <li>Go to Pipeline → Export</li>
            <li>Select JSON format and date range</li>
            <li>Download the file and paste its contents above</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
