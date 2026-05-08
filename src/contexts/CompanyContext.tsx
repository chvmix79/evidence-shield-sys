import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthContext";

interface Company {
  id: string;
  name: string | null;
  sector_id?: string | null;
}

interface CompanyContextType {
  selectedCompanyId: string;
  setSelectedCompanyId: (id: string) => void;
  companies: Company[];
  loading: boolean;
  refresh: () => void;
}

const CompanyContext = createContext<CompanyContextType>({
  selectedCompanyId: "",
  setSelectedCompanyId: () => {},
  companies: [],
  loading: false,
  refresh: () => {},
});

export function CompanyProvider({ children }: { children: React.ReactNode }) {
  const [selectedCompanyId, setSelectedCompanyIdState] = useState<string>(() => {
    const saved = localStorage.getItem("selected_company_id");
    if (saved && saved !== "null" && saved !== "undefined") return saved;
    
    const cachedList = localStorage.getItem("companies_list_cache_basic");
    if (cachedList) {
      try {
        const list = JSON.parse(cachedList);
        if (list.length > 0) return list[0].id;
      } catch (e) {}
    }
    return "";
  });

  const [companies, setCompanies] = useState<Company[]>(() => {
    const saved = localStorage.getItem("companies_list_cache_basic");
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { return []; }
    }
    return [];
  });
  const [loading, setLoading] = useState(false);

  const fetchCompanies = useCallback(async () => {
    if (loading) return;
    setLoading(true);

    try {
      console.log("[CompanyContext] Buscando empresas...");
      const { data, error } = await supabase.from("companies").select("id, name, sector_id");

      if (error) {
        console.error("Error fetching companies:", error);
      } else {
        const list = data || [];
        setCompanies(list);
        localStorage.setItem("companies_list_cache_basic", JSON.stringify(list));
        
        // Validar selección actual
        if (selectedCompanyId && !list.find(c => c.id === selectedCompanyId)) {
          setSelectedCompanyIdState("");
          localStorage.removeItem("selected_company_id");
        } else if (!selectedCompanyId && list.length > 0) {
          const firstId = list[0].id;
          setSelectedCompanyIdState(firstId);
          localStorage.setItem("selected_company_id", firstId);
        }
      }
    } catch (err) {
      console.error("Critical error in fetchCompanies:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedCompanyId, loading]);


  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && user) {
      fetchCompanies();
    }
  }, [authLoading, user, fetchCompanies]);

  const refresh = useCallback(() => fetchCompanies(), [fetchCompanies]);

  const setSelectedCompanyId = useCallback((id: string) => {
    const cleanId = (!id || id === "null" || id === "undefined") ? "" : id;
    setSelectedCompanyIdState(cleanId);
    if (cleanId) localStorage.setItem("selected_company_id", cleanId);
    else localStorage.removeItem("selected_company_id");
  }, []);

  return (
    <CompanyContext.Provider value={{ selectedCompanyId, setSelectedCompanyId, companies, loading, refresh }}>
      {children}
    </CompanyContext.Provider>
  );
}

export const useCompany = () => useContext(CompanyContext);