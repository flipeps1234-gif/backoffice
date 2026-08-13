/**
 * On-screen names for the Schedule-C expense categories (lib/category.ts).
 * The CSV keeps the English line names; these are what the owner taps.
 */
export const messages = {
  "cats.pickerLabel": {
    en: "What kind of expense? (optional)",
    es: "¿Qué tipo de gasto? (opcional)",
    pt: "Que tipo de despesa? (opcional)",
  },
  "cats.none": { en: "No category", es: "Sin categoría", pt: "Sem categoria" },
  "cats.supplies": { en: "Supplies", es: "Materiales", pt: "Materiais" },
  "cats.car": {
    en: "Car & truck",
    es: "Auto y camioneta",
    pt: "Carro e caminhonete",
  },
  "cats.advertising": { en: "Advertising", es: "Publicidad", pt: "Publicidade" },
  "cats.insurance": { en: "Insurance", es: "Seguro", pt: "Seguro" },
  "cats.legal": {
    en: "Legal & professional",
    es: "Legal y profesional",
    pt: "Jurídico e profissional",
  },
  "cats.office": { en: "Office", es: "Oficina", pt: "Escritório" },
  "cats.rent": { en: "Rent or lease", es: "Renta o alquiler", pt: "Aluguel" },
  "cats.repairs": { en: "Repairs", es: "Reparaciones", pt: "Reparos" },
  "cats.contract": {
    en: "Contract labor",
    es: "Trabajadores contratados",
    pt: "Mão de obra contratada",
  },
  "cats.travel": { en: "Travel", es: "Viajes", pt: "Viagens" },
  "cats.meals": { en: "Meals", es: "Comidas", pt: "Refeições" },
  "cats.utilities": {
    en: "Utilities",
    es: "Servicios (luz, agua…)",
    pt: "Contas (luz, água…)",
  },
  "cats.other": { en: "Other", es: "Otro", pt: "Outro" },
} as const;
