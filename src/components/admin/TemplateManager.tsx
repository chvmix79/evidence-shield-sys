import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Layout, Shield, ListChecks, Cpu, Plus, Trash2, Sparkles, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { WITH_TIMEOUT } from "@/lib/supabaseSafe";

export function TemplateManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [sectorForm, setSectorForm] = useState({ name: "", description: "" });
  const [isAiConfiguring, setIsAiConfiguring] = useState<string | null>(null);
  const [standardForm, setStandardForm] = useState({ name: "", code: "", sector_id: "", description: "" });
  const [templateForm, setTemplateForm] = useState({ name: "", description: "", sector_id: "", standard_id: "", type: "security", probability: "3", impact: "3" });
  const [softwareForm, setSoftwareForm] = useState({ name: "", manufacturer: "", version: "", sector_id: "" });

  // Queries con Resiliencia
  const { data: sectors, isLoading: loadingSectors, error: sectorsErr, refetch: fetchSectors } = useQuery({
    queryKey: ["admin-sectors"],
    queryFn: async () => {
      return await WITH_TIMEOUT((async () => {
        const { data, error } = await supabase.from("sectors").select("*").order("name");
        if (error) throw error;
        localStorage.setItem("admin_sectors_cache", JSON.stringify(data || []));
        return data || [];
      })(), 10000, "El servidor de sectores no responde.");
    },
    initialData: () => {
      const saved = localStorage.getItem("admin_sectors_cache");
      try { return saved ? JSON.parse(saved) : undefined; } catch (e) { return undefined; }
    },
    staleTime: 5 * 60 * 1000,
    retry: 1
  });

  const { data: standards, isLoading: loadingStandards, error: standardsErr, refetch: fetchStandards } = useQuery({
    queryKey: ["admin-standards"],
    queryFn: async () => {
      return await WITH_TIMEOUT((async () => {
        const { data, error } = await supabase.from("standards").select("*, sectors(name)").order("name");
        if (error) throw error;
        localStorage.setItem("admin_standards_cache", JSON.stringify(data || []));
        return data || [];
      })(), 10000, "Error al cargar normativas.");
    },
    initialData: () => {
      const saved = localStorage.getItem("admin_standards_cache");
      try { return saved ? JSON.parse(saved) : undefined; } catch (e) { return undefined; }
    },
    staleTime: 5 * 60 * 1000,
    retry: 1
  });

  const { data: templates, isLoading: loadingTemplates, error: templatesErr, refetch: fetchTemplates } = useQuery({
    queryKey: ["admin-templates"],
    queryFn: async () => {
      return await WITH_TIMEOUT((async () => {
        const { data, error } = await supabase.from("risk_templates").select("*, sectors(name), standards(name)").order("name");
        if (error) throw error;
        localStorage.setItem("admin_templates_cache", JSON.stringify(data || []));
        return data || [];
      })(), 12000, "Error al cargar plantillas.");
    },
    initialData: () => {
      const saved = localStorage.getItem("admin_templates_cache");
      try { return saved ? JSON.parse(saved) : undefined; } catch (e) { return undefined; }
    },
    staleTime: 5 * 60 * 1000,
    retry: 1
  });

  const { data: softwareTemplates, isLoading: loadingSoftware, error: softwareErr, refetch: fetchSoftware } = useQuery({
    queryKey: ["admin-software"],
    queryFn: async () => {
      return await WITH_TIMEOUT((async () => {
        const { data, error } = await supabase.from("software_templates").select("*, sectors(name)").order("name");
        if (error) throw error;
        localStorage.setItem("admin_software_cache", JSON.stringify(data || []));
        return data || [];
      })(), 10000, "Error al cargar software base.");
    },
    initialData: () => {
      const saved = localStorage.getItem("admin_software_cache");
      try { return saved ? JSON.parse(saved) : undefined; } catch (e) { return undefined; }
    },
    staleTime: 5 * 60 * 1000,
    retry: 1
  });

  const fetchError = sectorsErr || standardsErr || templatesErr || softwareErr;
  const loading = loadingSectors || loadingStandards || loadingTemplates || loadingSoftware;

  // Mutations
  const createSector = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("sectors").insert([sectorForm]);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Sector creado correctamente" });
      queryClient.invalidateQueries({ queryKey: ["admin-sectors"] });
      setSectorForm({ name: "", description: "" });
    }
  });

  const createStandard = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("standards").insert([standardForm]);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Normativa creada correctamente" });
      queryClient.invalidateQueries({ queryKey: ["admin-standards"] });
      setStandardForm({ name: "", code: "", sector_id: "", description: "" });
    }
  });

  const createTemplate = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("risk_templates").insert([{
        ...templateForm,
        probability: Number(templateForm.probability),
        impact: Number(templateForm.impact),
        sector_id: templateForm.sector_id || null,
        standard_id: templateForm.standard_id || null
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Plantilla creada correctamente" });
      queryClient.invalidateQueries({ queryKey: ["admin-templates"] });
      setTemplateForm({ name: "", description: "", sector_id: "", standard_id: "", type: "security", probability: "3", impact: "3" });
    }
  });

  const createSoftwareTemplate = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("software_templates").insert([softwareForm]);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Software base creado" });
      queryClient.invalidateQueries({ queryKey: ["admin-software"] });
      setSoftwareForm({ name: "", manufacturer: "", version: "", sector_id: "" });
    }
  });

  const deleteItem = async (table: string, id: string, queryKey: string) => {
    if (!confirm("¿Seguro de eliminar este item?")) return;
    const { error } = await supabase.from(table as "standards" | "risk_templates" | "software_templates").delete().eq("id", id);
    if (error) toast({ title: "Error al eliminar", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Eliminado correctamente" });
      queryClient.invalidateQueries({ queryKey: [queryKey] });
    }
  };

  const handleAiConfig = async (sector: any) => {
    setIsAiConfiguring(sector.id);
    try {
      const prompt = `Actúa como un experto en riesgos y cumplimiento. 
      Genera una configuración completa para el sector: "${sector.name}". 
      Devuelve ÚNICAMENTE un objeto JSON válido con la siguiente estructura:
      {
        "standards": [{"name": "ej. ISO 27001", "code": "ISO-27001", "description": "..." }],
        "risks": [{"name": "ej. Robo de Datos", "description": "...", "type": "security|operational|financial|legal", "probability": 1-5, "impact": 1-5}],
        "software": [{"name": "Nombre del software", "manufacturer": "Nombre del fabricante", "version": "v1.0"}]
      }
      Manten la respuesta breve y en español. Solo el JSON.`;

      let aiResponse: string | null = null;
      let lastError: any = null;

      // Usar exclusivamente la Edge Function de Supabase (más seguro)
      console.log("Usando Edge Function para configuración IA...");
      try {
        const { data, error } = await WITH_TIMEOUT(
          supabase.functions.invoke("chat-ai", {
            body: { 
              message: prompt
            }
          }),
          25000,
          "La IA está tardando demasiado en responder. Inténtalo de nuevo en unos momentos."
        );

        if (error) {
          throw new Error(`Error de conexión Edge Function: ${error.message}`);
        }
        if (data?.error) {
          throw new Error(`Edge Function falló: ${data.error}`);
        }
        aiResponse = data?.reply || data?.content || "";
      } catch (err) {
        lastError = err;
        console.error("Error con Edge Function:", err);
      }
      
      if (!aiResponse) {
        throw new Error(`La IA no devolvió respuesta. Error: ${lastError?.message || 'Desconocido'}`);
      }

      if (!aiResponse) throw new Error(`La IA no devolvió respuesta. Error original Gemini: ${lastError?.message || lastError}`);
      
      let cleanJsonStr = aiResponse;
      // Buscar el primer '{' y el último '}' para extraer solo el JSON si hay texto adicional
      const firstBrace = cleanJsonStr.indexOf('{');
      const lastBrace = cleanJsonStr.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1) {
        cleanJsonStr = cleanJsonStr.substring(firstBrace, lastBrace + 1);
      }
      
      // Limpiar posibles bloques de código markdown
      cleanJsonStr = cleanJsonStr.replace(/```json/g, '').replace(/```/g, '').trim();
      
      const config = JSON.parse(cleanJsonStr);

      // Inserción segura con timeouts individuales y mapeo defensivo
      await WITH_TIMEOUT((async () => {
        if (config.standards?.length > 0) {
          const standardsToInsert = config.standards.map((s: any) => ({
            name: s.name || s.titulo || sector.name,
            code: s.code || s.codigo || s.name?.slice(0, 50),
            description: s.description || s.descripcion || "",
            sector_id: sector.id
          }));
          await supabase.from("standards").insert(standardsToInsert);
        }

        if (config.risks?.length > 0) {
          const risksToInsert = config.risks.map((r: any) => {
            let prob = parseInt(String(r.probability || r.probabilidad || 3));
            let imp = parseInt(String(r.impact || r.impacto || 3));
            if (isNaN(prob)) prob = 3;
            if (isNaN(imp)) imp = 3;

            return {
              name: r.name || r.titulo || "Riesgo Genérico",
              description: r.description || r.descripcion || "",
              type: String(r.type || r.tipo || "security").toLowerCase().includes('seg') ? 'security' : 
                    String(r.type || r.tipo || "security").toLowerCase().includes('op') ? 'operational' :
                    String(r.type || r.tipo || "security").toLowerCase().includes('fin') ? 'financial' : 'legal',
              probability: Math.max(1, Math.min(5, prob)),
              impact: Math.max(1, Math.min(5, imp)),
              sector_id: sector.id
            };
          });
          await supabase.from("risk_templates").insert(risksToInsert);
        }

        if (config.software?.length > 0) {
          const softwareToInsert = config.software.map((s: any) => ({
            name: String(s.name || s.nombre || "Software").slice(0, 200),
            manufacturer: String(s.manufacturer || s.fabricante || "").slice(0, 200),
            version: String(s.version || "1.0").slice(0, 50),
            sector_id: sector.id
          }));
          await supabase.from("software_templates").insert(softwareToInsert);
        }
      })(), 25000, "Error al guardar la configuración generada en la base de datos.");

      toast({ title: "Configuración Exitosa", description: `Sector ${sector.name} configurado exitosamente con IA` });
      // Only invalidate the specific queries that were affected, not ALL queries
      queryClient.invalidateQueries({ queryKey: ["admin-sectors"] });
      queryClient.invalidateQueries({ queryKey: ["admin-standards"] });
      queryClient.invalidateQueries({ queryKey: ["admin-templates"] });
      queryClient.invalidateQueries({ queryKey: ["admin-software"] });
    } catch (err: any) {
      console.error(err);
      toast({ title: "Error en IA", description: err.message, variant: "destructive" });
    } finally {
      setIsAiConfiguring(null);
    }
  };

  return (
    <Tabs defaultValue="sectors" className="space-y-4">
      <TabsList className="bg-muted/50 p-1">
        <TabsTrigger value="sectors" className="gap-2"><Layout className="w-4 h-4" /> Sectores</TabsTrigger>
        <TabsTrigger value="standards" className="gap-2"><Shield className="w-4 h-4" /> Normativas</TabsTrigger>
        <TabsTrigger value="templates" className="gap-2"><ListChecks className="w-4 h-4" /> Plantillas de Riesgo</TabsTrigger>
        <TabsTrigger value="software" className="gap-2"><Cpu className="w-4 h-4" /> Software Base</TabsTrigger>
      </TabsList>

      {fetchError ? (
        <div className="bg-destructive/10 border border-destructive p-4 rounded-xl text-destructive text-sm flex flex-col md:flex-row items-center justify-between gap-4">
          <div><strong>Error de Sincronización:</strong> {fetchError instanceof Error ? fetchError.message : "Error al cargar recursos admin."}</div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => { fetchSectors(); fetchStandards(); fetchTemplates(); fetchSoftware(); }} className="border-destructive text-destructive hover:bg-destructive hover:text-white">
              Sincronizar Recursos
            </Button>
            <Button variant="default" size="sm" onClick={async () => {
              await supabase.auth.refreshSession();
              fetchSectors(); fetchStandards(); fetchTemplates(); fetchSoftware();
            }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Reparar Repositorio
            </Button>
          </div>
        </div>
      ) : null}

      {/* Sectors Tab */}
      <TabsContent value="sectors" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Nuevo Sector</CardTitle>
            <CardDescription>Define industrias o sectores de negocio (ej: Agencia de Aduanas, TI, Salud).</CardDescription>
          </CardHeader>
          <CardContent className="flex gap-4 items-end">
            <div className="space-y-2 flex-1">
              <Label>Nombre</Label>
              <Input value={sectorForm.name} onChange={e => setSectorForm({...sectorForm, name: e.target.value})} placeholder="Nombre del sector" />
            </div>
            <div className="space-y-2 flex-[2]">
              <Label>Descripción</Label>
              <Input value={sectorForm.description} onChange={e => setSectorForm({...sectorForm, description: e.target.value})} placeholder="Breve descripción..." />
            </div>
            <Button onClick={() => createSector.mutate()} disabled={!sectorForm.name}>Guardar</Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sectors?.map(s => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell className="text-muted-foreground">{s.description || "—"}</TableCell>
                    <TableCell className="text-right flex justify-end gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="gap-2 border-primary/20 hover:bg-primary/5"
                        onClick={() => handleAiConfig(s)}
                        disabled={!!isAiConfiguring}
                      >
                        {isAiConfiguring === s.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 text-primary" />}
                        Configurar con IA
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => deleteItem("sectors", s.id, "admin-sectors")}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Standards Tab */}
      <TabsContent value="standards" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Nueva Normativa / Estándar</CardTitle>
            <CardDescription>Vincula normas de cumplimiento a sectores específicos.</CardDescription>
          </CardHeader>
          <CardContent className="grid md:grid-cols-4 gap-4 items-end">
            <div className="space-y-2">
              <Label>Sector</Label>
              <Select value={standardForm.sector_id} onValueChange={v => setStandardForm({...standardForm, sector_id: v})}>
                <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                <SelectContent>
                  {sectors?.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Nombre (ej: BASC)</Label>
              <Input value={standardForm.name} onChange={e => setStandardForm({...standardForm, name: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Código / Versión</Label>
              <Input value={standardForm.code} onChange={e => setStandardForm({...standardForm, code: e.target.value})} />
            </div>
            <Button onClick={() => createStandard.mutate()} disabled={!standardForm.name}>Añadir Norma</Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Normativa</TableHead>
                  <TableHead>Versión</TableHead>
                  <TableHead>Sector</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {standards?.map((st: any) => (
                  <TableRow key={st.id}>
                    <TableCell className="font-medium">{st.name}</TableCell>
                    <TableCell>{st.code || "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{st.sectors?.name || "Global"}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => deleteItem("standards", st.id, "admin-standards")}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Templates Tab */}
      <TabsContent value="templates" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Nueva Plantilla de Riesgo</CardTitle>
            <CardDescription>Crea riesgos predefinidos que los clientes pueden importar automáticamente.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Sector Objetivo</Label>
                <Select value={templateForm.sector_id} onValueChange={v => setTemplateForm({...templateForm, sector_id: v})}>
                  <SelectTrigger><SelectValue placeholder="Opcional..." /></SelectTrigger>
                  <SelectContent>
                    {sectors?.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Normativa Asociada</Label>
                <Select value={templateForm.standard_id} onValueChange={v => setTemplateForm({...templateForm, standard_id: v})}>
                  <SelectTrigger><SelectValue placeholder="Opcional..." /></SelectTrigger>
                  <SelectContent>
                    {standards?.filter((s:any) => !templateForm.sector_id || s.sector_id === templateForm.sector_id).map((s:any) => (
                      <SelectItem key={s.id} value={s.id}>{s.name} ({s.code})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tipo de Riesgo</Label>
                <Select value={templateForm.type} onValueChange={v => setTemplateForm({...templateForm, type: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="security">Seguridad</SelectItem>
                    <SelectItem value="operational">Operacional</SelectItem>
                    <SelectItem value="financial">Financiero</SelectItem>
                    <SelectItem value="legal">Legal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid md:grid-cols-4 gap-4 items-end">
              <div className="space-y-2 md:col-span-2">
                <Label>Nombre del Riesgo</Label>
                <Input value={templateForm.name} onChange={e => setTemplateForm({...templateForm, name: e.target.value})} placeholder="Ej: Contaminación de Carga" />
              </div>
              <div className="space-y-2">
                <Label>Probabilidad (1-5)</Label>
                <Input type="number" min="1" max="5" value={templateForm.probability} onChange={e => setTemplateForm({...templateForm, probability: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Impacto (1-5)</Label>
                <Input type="number" min="1" max="5" value={templateForm.impact} onChange={e => setTemplateForm({...templateForm, impact: e.target.value})} />
              </div>
            </div>
            <Button onClick={() => createTemplate.mutate()} className="w-full gap-2" disabled={!templateForm.name}>
              <Plus className="w-4 h-4" /> Crear Plantilla de Riesgo
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Riesgo</TableHead>
                  <TableHead>Sector / Normativa</TableHead>
                  <TableHead>Nivel Sugerido</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates?.map((t: any) => (
                  <TableRow key={t.id}>
                    <TableCell>
                      <div className="font-medium">{t.name}</div>
                      <div className="text-[10px] text-muted-foreground uppercase">{t.type}</div>
                    </TableCell>
                    <TableCell className="text-xs">
                      <div className="font-semibold text-primary">{t.sectors?.name || "Global"}</div>
                      <div className="text-muted-foreground italic">{t.standards?.name || "Genérico"}</div>
                    </TableCell>
                    <TableCell>
                      <span className="font-bold text-lg">{Number(t.probability) * Number(t.impact)}</span>
                      <span className="text-[10px] text-muted-foreground ml-1">({t.probability}x{t.impact})</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => deleteItem("risk_templates", t.id, "admin-templates")}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Software Tab */}
      <TabsContent value="software" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Nuevo Software por Sector</CardTitle>
            <CardDescription>Define qué activos de software son comunes en cada industria para el inventario inicial.</CardDescription>
          </CardHeader>
          <CardContent className="grid md:grid-cols-4 gap-4 items-end">
            <div className="space-y-2">
              <Label>Sector</Label>
              <Select value={softwareForm.sector_id} onValueChange={v => setSoftwareForm({...softwareForm, sector_id: v})}>
                <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                <SelectContent>
                  {sectors?.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Nombre Software</Label>
              <Input value={softwareForm.name} onChange={e => setSoftwareForm({...softwareForm, name: e.target.value})} placeholder="Ej: SAP, Oracle DB..." />
            </div>
            <div className="space-y-2">
              <Label>Fabricante</Label>
              <Input value={softwareForm.manufacturer} onChange={e => setSoftwareForm({...softwareForm, manufacturer: e.target.value})} placeholder="Ej: Microsoft" />
            </div>
            <Button onClick={() => createSoftwareTemplate.mutate()} disabled={!softwareForm.name || !softwareForm.sector_id}>Añadir Software</Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Software</TableHead>
                  <TableHead>Fabricante</TableHead>
                  <TableHead>Sector</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {softwareTemplates?.map((st: any) => (
                  <TableRow key={st.id}>
                    <TableCell className="font-medium">{st.name}</TableCell>
                    <TableCell>{st.manufacturer || "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{st.sectors?.name || "Global"}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => deleteItem("software_templates", st.id, "admin-software")}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
