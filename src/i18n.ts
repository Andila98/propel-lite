import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const resources = {
  en: {
    translation: {
        "dashboard": {
        "title": "Landlord Dashboard",
        "totalProperties": "Total Properties",
        "totalPropertiesDesc": "Managed properties",
        "totalTenants": "Total Tenants",
        "totalTenantsDesc": "Across all properties",
        "totalRevenue": "Total Revenue",
        "week": "Week",
        "month": "Month",
        "quarter": "Quarter",
        "occupancyRate": "Occupancy Rate",
        "occupancyRateDesc": "Percentage of properties occupied",
        "propertiesShowcase": "Properties Showcase",
        "propertiesShowcaseDesc": "A look at your managed properties.",
        "topPerformer": "Top Performer",
        "topPerformerDesc": "Highest earning property this {{context}}.",
        "topPerformerDesc_week": "Highest earning property this week.",
        "topPerformerDesc_month": "Highest earning property this month.",
        "topPerformerDesc_quarter": "Highest earning property this quarter.",
        "noRevenue": "No revenue data for this period.",
        "anomalyAlerts": "AI Anomaly Alerts",
        "anomalyAlertsDesc": "Potential issues flagged by our AI.",
        "tenants": "Tenants",
        "propertyManagers": "Property Managers"
        }
    },
  },
  es: {
    translation: {
        "dashboard": {
        "title": "Panel del Propietario",
        "totalProperties": "Propiedades Totales",
        "totalPropertiesDesc": "Propiedades gestionadas",
        "totalTenants": "Inquilinos Totales",
        "totalTenantsDesc": "En todas las propiedades",
        "totalRevenue": "Ingresos Totales",
        "week": "Semana",
        "month": "Mes",
        "quarter": "Trimestre",
        "occupancyRate": "Tasa de Ocupación",
        "occupancyRateDesc": "Porcentaje de propiedades ocupadas",
        "propertiesShowcase": "Muestra de Propiedades",
        "propertiesShowcaseDesc": "Un vistazo a sus propiedades gestionadas.",
        "topPerformer": "Mejor Rendimiento",
        "topPerformerDesc": "Propiedad con mayores ingresos este {{context}}.",
        "topPerformerDesc_week": "Propiedad con mayores ingresos esta semana.",
        "topPerformerDesc_month": "Propiedad con mayores ingresos este mes.",
        "topPerformerDesc_quarter": "Propiedad con mayores ingresos este trimestre.",
        "noRevenue": "No hay datos de ingresos para este período.",
        "anomalyAlerts": "Alertas de Anomalías de IA",
        "anomalyAlertsDesc": "Posibles problemas marcados por nuestra IA.",
        "tenants": "Inquilinos",
        "propertyManagers": "Administradores de Propiedades"
        }
    },
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // react already safes from xss
    },
    detection: {
      order: ['queryString', 'cookie', 'localStorage', 'navigator', 'htmlTag'],
      caches: ['cookie'],
    },
  });

export default i18n;
