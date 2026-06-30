import type { Locale } from "@/i18n/config";

// ─────────────────────────────────────────────────────────────────────────
// ⚠️ DRAFT CONTENT — to be reviewed and finalized by the shop owner.
// This is a first-draft editorial explainer (the customer's prompt left the
// English source blank). Replace the copy below with the owner's final text;
// the page structure does not need to change.
// ─────────────────────────────────────────────────────────────────────────

export type ExplainerSection = { heading: string; body: string[] };
export type Explainer = {
  title: string;
  intro: string;
  sections: ExplainerSection[];
  closing: string;
};

const en: Explainer = {
  title: "Air Suspension vs Coilovers",
  intro:
    "Two very different ways to get your car low. Here's how they compare — and how to choose the one that fits the way you drive.",
  sections: [
    {
      heading: "What is air suspension?",
      body: [
        "Air suspension swaps your springs for air springs (bags) fed by a compressor and tank.",
        "At the press of a button you can raise the car to clear speed bumps and driveways, then drop it slammed when you park. Ride height is adjustable on the fly.",
      ],
    },
    {
      heading: "What are coilovers?",
      body: [
        "Coilovers combine a coil spring and a shock absorber into one adjustable unit.",
        "You set the ride height and damping once, with a wrench, and it stays there. It's a fixed, mechanical setup tuned for how the car sits and handles.",
      ],
    },
    {
      heading: "Ride & comfort",
      body: [
        "Air gives a softer everyday ride and the freedom to lift over rough roads and ramps.",
        "Coilovers ride firmer and more connected — great for spirited driving, less forgiving over bad roads.",
      ],
    },
    {
      heading: "Adjustability",
      body: [
        "Air adjusts at the touch of a button, any time.",
        "Coilovers are set-and-leave: you dial in the perfect height once, with no on-the-fly changes.",
      ],
    },
    {
      heading: "Daily usability in 6th of October",
      body: [
        "If you deal with speed bumps, steep garage ramps and rough streets every day, air's lift function is a real advantage.",
        "Coilovers can be set at a sensible height — but you live with that one height everywhere you go.",
      ],
    },
    {
      heading: "Price & maintenance",
      body: [
        "Coilovers usually cost less up front and have fewer parts to look after.",
        "Air systems cost more and add components — compressor, tank, management — that need occasional care, but deliver a lift-and-slam experience nothing else matches.",
      ],
    },
    {
      heading: "So which should you pick?",
      body: [
        "Want the lowest look with everyday practicality and lift on demand? Go air.",
        "Want a focused, firmer, simpler setup and the best value for handling? Go coilovers.",
        "Either way, our team will fit it and dial it in for your car.",
      ],
    },
  ],
  closing:
    "Still not sure? Tell us how you use your car and we'll recommend the right setup.",
};

const ar: Explainer = {
  title: "التعليق الهوائي مقابل الكويل أوفر",
  intro:
    "طريقتان مختلفتان تمامًا لتنزيل سيارتك. إليك المقارنة بينهما — وكيف تختار ما يناسب طريقة قيادتك.",
  sections: [
    {
      heading: "ما هو التعليق الهوائي؟",
      body: [
        "يستبدل التعليق الهوائي الياي (السوست) بِوسائد هوائية تعمل بكمبروسر وخزان هواء.",
        "بضغطة زر ترفع السيارة لتتخطى المطبات ومداخل الجراجات، ثم تنزّلها لأقصى انخفاض عند الوقوف. والارتفاع قابل للتعديل أثناء القيادة.",
      ],
    },
    {
      heading: "ما هو الكويل أوفر؟",
      body: [
        "يجمع الكويل أوفر بين الياي والمساعد (الشوك) في وحدة واحدة قابلة للضبط.",
        "تضبط الارتفاع ومستوى الصلابة مرة واحدة بالمفتاح، ويبقى كما هو. إنه نظام ميكانيكي ثابت مضبوط لطريقة جلوس السيارة وتحكّمها.",
      ],
    },
    {
      heading: "الراحة والقيادة",
      body: [
        "يمنحك الهواء قيادة يومية أكثر نعومة وحرية الرفع فوق الطرق الوعرة والمنحدرات.",
        "أما الكويل أوفر فأكثر صلابة وتماسكًا — رائع للقيادة الرياضية، وأقل تسامحًا مع الطرق السيئة.",
      ],
    },
    {
      heading: "قابلية الضبط",
      body: [
        "الهواء يُضبط بضغطة زر في أي وقت.",
        "الكويل أوفر يُضبط ويُترك: تختار الارتفاع المثالي مرة واحدة دون تغيير أثناء القيادة.",
      ],
    },
    {
      heading: "الاستخدام اليومي في السادس من أكتوبر",
      body: [
        "إن كنت تتعامل يوميًا مع المطبات ومنحدرات الجراجات والشوارع الوعرة، فميزة الرفع في الهواء فائدة حقيقية.",
        "يمكن ضبط الكويل أوفر على ارتفاع معقول — لكنك تعيش بهذا الارتفاع نفسه في كل مكان.",
      ],
    },
    {
      heading: "السعر والصيانة",
      body: [
        "عادةً ما يكون الكويل أوفر أقل تكلفة في البداية وأقل أجزاءً للصيانة.",
        "أنظمة الهواء أعلى تكلفة وتضيف مكوّنات — كمبروسر وخزان ونظام إدارة — تحتاج لعناية من حين لآخر، لكنها تقدّم تجربة الرفع والتنزيل التي لا يضاهيها شيء.",
      ],
    },
    {
      heading: "فأيهما تختار؟",
      body: [
        "تريد أقصى انخفاض مع عملية يومية وإمكانية رفع عند الطلب؟ اختر الهواء.",
        "تريد نظامًا أبسط وأكثر صلابة وأفضل قيمة للتحكم؟ اختر الكويل أوفر.",
        "في الحالتين، فريقنا سيركّبه ويضبطه لسيارتك.",
      ],
    },
  ],
  closing:
    "ما زلت غير متأكد؟ أخبرنا كيف تستخدم سيارتك وسنرشّح لك النظام المناسب.",
};

export function getExplainer(locale: Locale): Explainer {
  return locale === "ar" ? ar : en;
}
