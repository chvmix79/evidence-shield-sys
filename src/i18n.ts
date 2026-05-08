import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

const resources = {
  es: {
    translation: {
      common: {
        loading: "Cargando...",
        save: "Guardar",
        cancel: "Cancelar",
        delete: "Eliminar",
        edit: "Editar",
        create: "Crear",
        search: "Buscar",
        noData: "No hay datos",
      },
      nav: {
        dashboard: "Dashboard",
        companies: "Empresas",
        risks: "Riesgos",
        actions: "Plan de Acción",
        evidences: "Evidencias",
        alerts: "Alertas",
        reports: "Reportes",
        auditor: "Auditor",
      },
      auth: {
        login: "Iniciar Sesión",
        email: "Correo electrónico",
        password: "Contraseña",
        forgotPassword: "¿Olvidaste tu contraseña?",
        signIn: "Ingresar",
        signUp: "Registrarse",
      },
      risks: {
        title: "Gestión de Riesgos",
        newRisk: "Nuevo Riesgo",
        editRisk: "Editar Riesgo",
        name: "Nombre del Riesgo",
        description: "Descripción",
        type: "Tipo",
        probability: "Probabilidad",
        impact: "Impacto",
        level: "Nivel",
        status: "Estado",
        company: "Empresa",
        types: {
          operational: "Operativo",
          legal: "Legal",
          financial: "Financiero",
          security: "Seguridad",
        },
        statuses: {
          active: "Activo",
          mitigated: "Mitigado",
        },
      },
      actions: {
        title: "Plan de Acción",
        newAction: "Nueva Acción",
        editAction: "Editar Acción",
        description: "Descripción",
        responsible: "Responsable",
        dueDate: "Fecha Límite",
        risk: "Riesgo Asociado",
        statuses: {
          pending: "Pendiente",
          in_progress: "En Proceso",
          completed: "Completado",
        },
      },
      companies: {
        title: "Empresas",
        newCompany: "Nueva Empresa",
        name: "Nombre de la Empresa",
        sector: "Sector",
        employees: "N° Empleados",
        riskLevel: "Nivel de Riesgo",
        levels: {
          low: "Bajo",
          medium: "Medio",
          high: "Alto",
          critical: "Crítico",
        },
      },
      evidences: {
        title: "Evidencias",
        newEvidence: "Nueva Evidencia",
        name: "Nombre",
        file: "Archivo",
        description: "Descripción",
      },
      alerts: {
        title: "Alertas",
        types: {
          overdue_action: "Acción Vencida",
          critical_risk: "Riesgo Crítico",
          missing_evidence: "Evidencia Faltante",
        },
      },
      reports: {
        title: "Reportes",
        exportPDF: "Exportar PDF",
        score: "Score Global",
        totalRisks: "Total Riesgos",
        activeRisks: "Activos",
        totalActions: "Acciones",
        completedActions: "Completadas",
        totalEvidences: "Evidencias",
      },
      auditor: {
        title: "Panel de Auditor",
        readOnly: "Modo solo lectura",
        accessDenied: "Acceso Restringido",
      },
    },
  },
  en: {
    translation: {
      common: {
        loading: "Loading...",
        save: "Save",
        cancel: "Cancel",
        delete: "Delete",
        edit: "Edit",
        create: "Create",
        search: "Search",
        noData: "No data",
      },
      nav: {
        dashboard: "Dashboard",
        companies: "Companies",
        risks: "Risks",
        actions: "Action Plan",
        evidences: "Evidences",
        alerts: "Alerts",
        reports: "Reports",
        auditor: "Auditor",
      },
      auth: {
        login: "Sign In",
        email: "Email",
        password: "Password",
        forgotPassword: "Forgot password?",
        signIn: "Sign In",
        signUp: "Sign Up",
      },
      risks: {
        title: "Risk Management",
        newRisk: "New Risk",
        editRisk: "Edit Risk",
        name: "Risk Name",
        description: "Description",
        type: "Type",
        probability: "Probability",
        impact: "Impact",
        level: "Level",
        status: "Status",
        company: "Company",
        types: {
          operational: "Operational",
          legal: "Legal",
          financial: "Financial",
          security: "Security",
        },
        statuses: {
          active: "Active",
          mitigated: "Mitigated",
        },
      },
      actions: {
        title: "Action Plan",
        newAction: "New Action",
        editAction: "Edit Action",
        description: "Description",
        responsible: "Responsible",
        dueDate: "Due Date",
        risk: "Associated Risk",
        statuses: {
          pending: "Pending",
          in_progress: "In Progress",
          completed: "Completed",
        },
      },
      companies: {
        title: "Companies",
        newCompany: "New Company",
        name: "Company Name",
        sector: "Sector",
        employees: "Employees",
        riskLevel: "Risk Level",
        levels: {
          low: "Low",
          medium: "Medium",
          high: "High",
          critical: "Critical",
        },
      },
      evidences: {
        title: "Evidences",
        newEvidence: "New Evidence",
        name: "Name",
        file: "File",
        description: "Description",
      },
      alerts: {
        title: "Alerts",
        types: {
          overdue_action: "Overdue Action",
          critical_risk: "Critical Risk",
          missing_evidence: "Missing Evidence",
        },
      },
      reports: {
        title: "Reports",
        exportPDF: "Export PDF",
        score: "Global Score",
        totalRisks: "Total Risks",
        activeRisks: "Active",
        totalActions: "Actions",
        completedActions: "Completed",
        totalEvidences: "Evidences",
      },
      auditor: {
        title: "Auditor Panel",
        readOnly: "Read-only mode",
        accessDenied: "Access Denied",
      },
    },
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: "es",
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
