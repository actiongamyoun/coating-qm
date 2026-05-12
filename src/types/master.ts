export type MasterRow = {
  project: string;
  ship: string;
  block: string;
  code: string;
  name: string;
  surface: string;
  area_total: string;
  area_pre: string;
  coat_order: string;
  maker: string;
  paint: string;
  dft: string;
  wet: string;
  tsr: string;
  psr: string;
  theory_qty: string;
  actual_qty: string;
  stage: string;
  shop: string;
  pspc: string;
  qm: string;
};

export const MASTER_COLUMNS: Array<{
  key: keyof MasterRow;
  label: string;
  type: string;
  required?: boolean;
  width?: string;
  options?: string[];
}> = [
  { key: 'project',     label: '프로젝트',  type: 'text',   required: true,  width: 'min-w-[130px]' },
  { key: 'ship',        label: '호선',      type: 'text',   required: true,  width: 'min-w-[130px]' },
  { key: 'block',       label: 'BLOCK',     type: 'text',   required: true,  width: 'min-w-[80px]' },
  { key: 'code',        label: '부위코드',  type: 'text',                    width: 'min-w-[80px]' },
  { key: 'name',        label: '부위명',    type: 'text',   required: true,  width: 'min-w-[180px]' },
  { key: 'surface',     label: '표면처리',  type: 'text',                    width: 'min-w-[80px]' },
  { key: 'area_total',  label: '전체면적',  type: 'num',                     width: 'min-w-[90px]' },
  { key: 'area_pre',    label: '선행면적',  type: 'num',                     width: 'min-w-[90px]' },
  { key: 'coat_order',  label: '도장순서',  type: 'num',    required: true,  width: 'min-w-[70px]' },
  { key: 'maker',       label: 'MAKER',     type: 'text',   required: true,  width: 'min-w-[100px]' },
  { key: 'paint',       label: '도료명',    type: 'text',   required: true,  width: 'min-w-[150px]' },
  { key: 'dft',         label: 'DFT',       type: 'num',    required: true,  width: 'min-w-[70px]' },
  { key: 'wet',         label: 'WET',       type: 'num',                     width: 'min-w-[70px]' },
  { key: 'tsr',         label: 'TSR',       type: 'num',                     width: 'min-w-[70px]' },
  { key: 'psr',         label: 'PSR',       type: 'num',                     width: 'min-w-[70px]' },
  { key: 'theory_qty',  label: '이론필요량', type: 'num',                    width: 'min-w-[80px]' },
  { key: 'actual_qty',  label: '실제필요량', type: 'num',                    width: 'min-w-[80px]' },
  { key: 'stage',       label: '선행/후행', type: 'select', width: 'min-w-[80px]', options: ['','선행','후행'] },
  { key: 'shop',        label: '작업장',    type: 'select', width: 'min-w-[80px]', options: ['','사내','사외'] },
  { key: 'pspc',        label: 'PSPC',      type: 'select', width: 'min-w-[60px]', options: ['','O','X'] },
  { key: 'qm',          label: 'QM',        type: 'select', width: 'min-w-[60px]', options: ['','O','X'] },
];

export const emptyRow = (): MasterRow => ({
  project: '', ship: '', block: '', code: '', name: '', surface: '',
  area_total: '', area_pre: '', coat_order: '', maker: '', paint: '',
  dft: '', wet: '', tsr: '', psr: '', theory_qty: '', actual_qty: '',
  stage: '', shop: '', pspc: '', qm: '',
});
