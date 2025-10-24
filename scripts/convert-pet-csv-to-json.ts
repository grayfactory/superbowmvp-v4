// scripts/convert-pet-csv-to-json.ts
// Converts pet_growth_dataset.csv to JSON format for efficient lookup

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface CsvRow {
  Type: string;
  Breed: string;
  Month: string;
  LifeStage: string;
  Size: string;
  WeightAvgKg: string;
  UnderweightRangeKg: string;
  OverweightRangeKg: string;
  BiteForceN: string;
  SkullType: string;
}

interface MonthData {
  month: number;
  lifeStage: string;
  size: string;
  weightAvgKg: number;
  underweightKg: number;
  overweightKg: number;
  biteForceN: number;
  skullType: string;
}

interface BreedData {
  [breed: string]: {
    [month: string]: MonthData;
  };
}

function parseCSV(filePath: string): CsvRow[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.trim().split('\n');
  const headers = lines[0].split(',');

  return lines.slice(1).map(line => {
    const values = line.split(',');
    const row: any = {};
    headers.forEach((header, index) => {
      row[header] = values[index];
    });
    return row as CsvRow;
  });
}

function convertToJSON(csvRows: CsvRow[]): BreedData {
  const result: BreedData = {};

  for (const row of csvRows) {
    const breed = row.Breed;
    const month = row.Month;

    if (!result[breed]) {
      result[breed] = {};
    }

    result[breed][month] = {
      month: parseInt(month),
      lifeStage: row.LifeStage,
      size: row.Size,
      weightAvgKg: parseFloat(row.WeightAvgKg),
      underweightKg: parseFloat(row.UnderweightRangeKg),
      overweightKg: parseFloat(row.OverweightRangeKg),
      biteForceN: parseFloat(row.BiteForceN),
      skullType: row.SkullType
    };
  }

  return result;
}

// Main execution
const csvPath = path.join(__dirname, '../docs/pet_growth_dataset.csv');
const outputPath = path.join(__dirname, '../src/lib/data/pet_breed_data.json');

console.log('Converting CSV to JSON...');
const csvRows = parseCSV(csvPath);
const jsonData = convertToJSON(csvRows);

fs.writeFileSync(outputPath, JSON.stringify(jsonData, null, 2));
console.log(`✅ Converted ${Object.keys(jsonData).length} breeds with month-by-month data`);
console.log(`Output: ${outputPath}`);
