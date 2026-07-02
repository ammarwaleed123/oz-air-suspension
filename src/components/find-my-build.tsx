"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type PickerCar = {
  slug: string;
  make: string;
  model: string;
  yearStart: number | null;
  yearEnd: number | null;
};

// The hero "Find My Build" picker. A make → model cascade built entirely from
// our REAL curated cars (the ones that actually have an air kit). Choosing a
// model resolves to that car's air-kit page — no dead ends. Year is an optional
// refinement drawn from the chosen car's own range (informational).
export function FindMyBuild({
  cars,
  basePath,
  labels,
}: {
  cars: PickerCar[];
  basePath: string; // e.g. "/ar/air-kits"
  labels: {
    selectMake: string;
    selectModel: string;
    year: string;
    findMyBuild: string;
    empty: string;
    requestYourCar: string;
    requestHref: string;
  };
}) {
  const router = useRouter();
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");

  const makes = useMemo(
    () => Array.from(new Set(cars.map((c) => c.make))).sort(),
    [cars]
  );
  const models = useMemo(
    () =>
      Array.from(
        new Set(cars.filter((c) => c.make === make).map((c) => c.model))
      ).sort(),
    [cars, make]
  );
  const selected = useMemo(
    () => cars.find((c) => c.make === make && c.model === model),
    [cars, make, model]
  );
  const years = useMemo(() => {
    if (!selected?.yearStart) return [];
    const end = selected.yearEnd ?? new Date().getFullYear();
    const out: number[] = [];
    for (let y = end; y >= selected.yearStart; y--) out.push(y);
    return out;
  }, [selected]);

  if (cars.length === 0) {
    return (
      <div className="rounded-xl border border-white/15 bg-white/5 p-5">
        <p className="text-sm text-surface/70">{labels.empty}</p>
        <Link
          href={labels.requestHref}
          className="mt-3 inline-block rounded-md bg-accent px-4 py-2.5 text-sm font-bold uppercase tracking-wide text-white"
        >
          {labels.requestYourCar}
        </Link>
      </div>
    );
  }

  const select =
    "w-full appearance-none rounded-md border border-white/15 bg-coal px-3 py-3 text-sm text-surface focus:border-accent focus:outline-none";

  function go() {
    if (selected) router.push(`${basePath}/${selected.slug}`);
  }

  return (
    <div className="rounded-xl border border-white/15 bg-white/5 p-2 backdrop-blur sm:flex sm:items-stretch sm:gap-2">
      <div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-[1.2fr_1.2fr_0.8fr]">
        <select
          aria-label={labels.selectMake}
          value={make}
          onChange={(e) => {
            setMake(e.target.value);
            setModel("");
            setYear("");
          }}
          className={select}
        >
          <option value="">{labels.selectMake}</option>
          {makes.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>

        <select
          aria-label={labels.selectModel}
          value={model}
          onChange={(e) => {
            setModel(e.target.value);
            setYear("");
          }}
          disabled={!make}
          className={`${select} disabled:opacity-50`}
        >
          <option value="">{labels.selectModel}</option>
          {models.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>

        <select
          aria-label={labels.year}
          value={year}
          onChange={(e) => setYear(e.target.value)}
          disabled={!selected || years.length === 0}
          className={`${select} disabled:opacity-50`}
        >
          <option value="">{labels.year}</option>
          {years.map((y) => (
            <option key={y} value={String(y)}>
              {y}
            </option>
          ))}
        </select>
      </div>

      <button
        type="button"
        onClick={go}
        disabled={!selected}
        className="mt-2 w-full rounded-md bg-accent px-6 py-3 text-sm font-bold uppercase tracking-wide text-white transition-opacity hover:opacity-90 disabled:opacity-40 sm:mt-0 sm:w-auto"
      >
        {labels.findMyBuild}
      </button>
    </div>
  );
}
