import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Copy, KeyRound, PlugZap, Send, ShieldCheck, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function Integrations() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const { data: keys, isLoading } = trpc.integrations.listApiKeys.useQuery(undefined, {
    enabled: user?.role === "admin",
  });
  const [name, setName] = useState("");
  const [fhirUrl, setFhirUrl] = useState("");
  const [hl7Url, setHl7Url] = useState("");
  const [newKey, setNewKey] = useState<string | null>(null);

  const createKey = trpc.integrations.createApiKey.useMutation({
    onSuccess: async (result) => {
      setNewKey(result.apiKey);
      setName("");
      setFhirUrl("");
      setHl7Url("");
      await utils.integrations.listApiKeys.invalidate();
      toast.success("Integration API key created");
    },
    onError: (error) => toast.error(error.message),
  });
  const revokeKey = trpc.integrations.revokeApiKey.useMutation({
    onSuccess: async () => {
      await utils.integrations.listApiKeys.invalidate();
      toast.success("Integration API key revoked");
    },
    onError: (error) => toast.error(error.message),
  });

  const copyNewKey = async () => {
    if (!newKey) return;
    await navigator.clipboard.writeText(newKey);
    toast.success("API key copied to clipboard");
  };

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-primary"><PlugZap className="h-5 w-5" /><span className="text-sm font-semibold">Interoperability</span></div>
            <h1 className="text-3xl font-bold tracking-tight">EHR integrations</h1>
            <p className="mt-1 max-w-3xl text-muted-foreground">Manage revocable API keys for inbound FHIR R4 ImagingStudy orders, HL7 v2 ORM orders, and outbound finalized reports.</p>
          </div>
          <Badge variant="outline" className="w-fit gap-1.5 px-3 py-1.5"><ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />Key-based access</Badge>
        </div>

        {user?.role !== "admin" ? (
          <Card><CardHeader><CardTitle>Administrator access required</CardTitle><CardDescription>Only PACS administrators can create, configure, or revoke external integration credentials.</CardDescription></CardHeader></Card>
        ) : (
          <>
            <div className="grid gap-6 lg:grid-cols-5">
              <Card className="lg:col-span-2">
                <CardHeader><CardTitle className="flex items-center gap-2"><KeyRound className="h-5 w-5" />Create API key</CardTitle><CardDescription>Each key can optionally store its approved destination URLs for report delivery.</CardDescription></CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2"><Label htmlFor="integration-name">Integration name</Label><Input id="integration-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Example Hospital EHR" /></div>
                  <div className="space-y-2"><Label htmlFor="fhir-destination">FHIR report destination (optional)</Label><Input id="fhir-destination" value={fhirUrl} onChange={(event) => setFhirUrl(event.target.value)} placeholder="https://ehr.example/fhir/DiagnosticReport" /></div>
                  <div className="space-y-2"><Label htmlFor="hl7-destination">HL7 HTTP destination (optional)</Label><Input id="hl7-destination" value={hl7Url} onChange={(event) => setHl7Url(event.target.value)} placeholder="https://ehr.example/hl7/results" /></div>
                  <Button className="w-full" disabled={name.trim().length < 3 || createKey.isPending} onClick={() => createKey.mutate({ name: name.trim(), fhirReportDeliveryUrl: fhirUrl.trim(), hl7ReportDeliveryUrl: hl7Url.trim() })}>{createKey.isPending ? "Creating…" : "Create API key"}</Button>
                </CardContent>
              </Card>

              <Card className="border-primary/30 bg-primary/5 lg:col-span-3">
                <CardHeader><CardTitle>Endpoint contract</CardTitle><CardDescription>Use a generated key as <code className="rounded bg-muted px-1 py-0.5">Authorization: Bearer pacs_live_…</code>.</CardDescription></CardHeader>
                <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
                  <div className="rounded-lg border bg-background p-3"><p className="font-mono font-semibold text-primary">POST /api/fhir/ImagingStudy</p><p className="mt-1 text-muted-foreground">Receive FHIR R4 imaging orders.</p></div>
                  <div className="rounded-lg border bg-background p-3"><p className="font-mono font-semibold text-primary">POST /api/hl7/orm</p><p className="mt-1 text-muted-foreground">Receive HL7 v2 ORM messages and return ACK.</p></div>
                  <div className="rounded-lg border bg-background p-3"><p className="font-mono font-semibold text-primary">POST …/report/$send</p><p className="mt-1 text-muted-foreground">Deliver a final FHIR DiagnosticReport.</p></div>
                  <div className="rounded-lg border bg-background p-3"><p className="font-mono font-semibold text-primary">POST …/report</p><p className="mt-1 text-muted-foreground">Deliver a final HL7 ORU^R01 over HTTPS.</p></div>
                </CardContent>
              </Card>
            </div>

            {newKey && <Card className="border-amber-500/40 bg-amber-500/10"><CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center"><div className="flex-1"><p className="font-semibold text-amber-800 dark:text-amber-300">Copy this key now.</p><p className="mt-1 text-sm text-muted-foreground">It is shown only once and cannot be retrieved later.</p><code className="mt-3 block break-all rounded bg-background p-3 text-xs">{newKey}</code></div><Button variant="outline" onClick={copyNewKey}><Copy className="mr-2 h-4 w-4" />Copy</Button><Button variant="ghost" onClick={() => setNewKey(null)}>Dismiss</Button></CardContent></Card>}

            <Card>
              <CardHeader><CardTitle>Integration keys</CardTitle><CardDescription>Revoke a key immediately if an EHR connection is retired or a credential may have been exposed.</CardDescription></CardHeader>
              <CardContent>
                {isLoading ? <p className="text-sm text-muted-foreground">Loading integration keys…</p> : !keys?.length ? <p className="text-sm text-muted-foreground">No integration keys have been created.</p> : <div className="divide-y rounded-lg border">{keys.map((key) => <div key={key.id} className="flex flex-col gap-3 p-4 md:flex-row md:items-center"><div className="flex-1"><div className="flex items-center gap-2"><p className="font-medium">{key.name}</p><Badge variant={key.isActive ? "secondary" : "outline"}>{key.isActive ? "Active" : "Revoked"}</Badge></div><p className="mt-1 font-mono text-xs text-muted-foreground">{key.keyPrefix}••••••••</p><div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground"><span>Created {new Date(key.createdAt).toLocaleDateString()}</span>{key.lastUsedAt && <span>Last used {new Date(key.lastUsedAt).toLocaleString()}</span>}{key.fhirReportDeliveryUrl && <span className="flex items-center gap-1"><Send className="h-3 w-3" />FHIR delivery configured</span>}{key.hl7ReportDeliveryUrl && <span className="flex items-center gap-1"><Send className="h-3 w-3" />HL7 delivery configured</span>}</div></div>{key.isActive === 1 && <Button variant="outline" size="sm" disabled={revokeKey.isPending} onClick={() => revokeKey.mutate({ id: key.id })}><Trash2 className="mr-2 h-4 w-4" />Revoke</Button>}</div>)}</div>}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
