import * as XLSX from 'xlsx';
import { AssetFormData, ValidationError } from '../types/asset.types';

export interface ExcelRow {
  'Asset Name'?: string;
  'Asset Type'?: string;
  'Description'?: string;
  'Count'?: number | string;
}

export class ExcelParser {
  static parse(file: File): Promise<{ data: AssetFormData[]; errors: ValidationError[] }> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e: ProgressEvent<FileReader>) => {
        try {
          const data = e.target?.result;
          if (typeof data !== 'string') {
            reject(new Error('Failed to read file'));
            return;
          }
          
          const workbook = XLSX.read(data, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          
          // Convert to JSON
          const jsonData = XLSX.utils.sheet_to_json<ExcelRow>(worksheet);
          
          const assets: AssetFormData[] = [];
          const errors: ValidationError[] = [];

          jsonData.forEach((row: ExcelRow, index: number) => {
            // Map Excel columns to asset fields
            const assetData: AssetFormData = {
              asset_name: String(row['Asset Name'] || '').trim(),
              asset_type: String(row['Asset Type'] || '').trim(),
              asset_description: String(row['Description'] || '').trim(),
              asset_count: row['Count'] ? Number(row['Count']) : 0,
            };

            // Basic validation
            if (!assetData.asset_name) {
              errors.push({
                row: index + 2,
                field: 'asset_name',
                message: 'Asset name is required',
                value: assetData.asset_name,
              });
            } else if (!assetData.asset_name.includes('-')) {
              errors.push({
                row: index + 2,
                field: 'asset_name',
                message: 'Asset name must include location (e.g., laptop-bangalore)',
                value: assetData.asset_name,
              });
            }

            if (!assetData.asset_type) {
              errors.push({
                row: index + 2,
                field: 'asset_type',
                message: 'Asset type is required',
                value: assetData.asset_type,
              });
            }

            if (isNaN(Number(assetData.asset_count)) || Number(assetData.asset_count) < 0) {
              errors.push({
                row: index + 2,
                field: 'asset_count',
                message: 'Asset count must be a positive number',
                value: assetData.asset_count,
              });
            }

            // If no errors, add to assets
            if (errors.length === 0 || !errors.some(e => e.row === index + 2)) {
              assets.push(assetData);
            }
          });

          resolve({ data: assets, errors });
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = (error: ProgressEvent<FileReader>) => reject(error);
      reader.readAsBinaryString(file);
    });
  }

  static validateExcelStructure(data: ExcelRow[]): boolean {
    if (data.length === 0) return false;
    
    const requiredColumns = ['Asset Name', 'Asset Type', 'Description', 'Count'];
    const firstRow = data[0];
    
    return requiredColumns.every(col => col in firstRow);
  }
}