// N7: fake app detector — scans installed apps for lookalikes of official
// Bangladesh banking/MFS apps. Uses the custom InstalledApps native module
// (bare/prebuild only; null-safe in Expo Go).

import { NativeModules } from 'react-native';
import { levenshtein } from '../utils/levenshtein';

const InstalledAppsNative: {
  getInstalledApps: () => Promise<{ packageName: string; appName: string }[]>;
} | null = NativeModules.InstalledApps ?? null;

// Official package names of BD financial apps
const OFFICIAL_APPS: Record<string, string> = {
  'com.bkash.customerapp':        'bKash',
  'com.konasl.nagad':             'Nagad',
  'com.dbbl.mbs.apps.main':       'Rocket (DBBL)',
  'bd.com.upay.customer':         'Upay',
  'com.dbbl.pc.dbblmobilebanking':'DBBL Mobile Banking',
  'com.ibbl.cellfin':             'CellFin (Islami Bank)',
  'com.bracbank.astha':           'Astha (BRAC Bank)',
  'com.thecitybank.citytouch':    'Citytouch',
  'com.ebl.skybanking':           'EBL Skybanking',
  'com.grameenphone.mygp':        'MyGP',
  'com.arena.banglalinkmela':     'MyBL',
  'net.omobio.robisc':            'My Robi',
};

// Words fraudsters put in fake financial app names
const SUSPICIOUS_NAME_RE = /bkash|bikash|nagad|rocket|upay|dbbl|islami.?bank|brac.?bank|city.?bank|sonali|janata|agrani|bangladesh.?bank/i;

export interface SuspiciousApp {
  packageName: string;
  appName: string;
  reason_bn: string;
  severity: 'high' | 'medium';
  mimics: string; // which official app it appears to imitate
}

export interface FakeAppScanResult {
  available: boolean;      // native module present?
  totalScanned: number;
  officialFound: string[]; // legit official apps installed
  suspicious: SuspiciousApp[];
}

export function isFakeAppScanAvailable(): boolean {
  return !!InstalledAppsNative;
}

export async function scanForFakeApps(): Promise<FakeAppScanResult> {
  if (!InstalledAppsNative) {
    return { available: false, totalScanned: 0, officialFound: [], suspicious: [] };
  }

  const apps = await InstalledAppsNative.getInstalledApps();
  const officialFound: string[] = [];
  const suspicious: SuspiciousApp[] = [];

  const officialPkgs = Object.keys(OFFICIAL_APPS);

  for (const app of apps) {
    const pkg  = app.packageName.toLowerCase();
    const name = app.appName ?? '';

    // Exact official package → legit
    if (OFFICIAL_APPS[app.packageName]) {
      officialFound.push(OFFICIAL_APPS[app.packageName]);
      continue;
    }

    // Package-name lookalike of an official app (e.g. com.bkash.customerap)
    let matched = false;
    for (const off of officialPkgs) {
      const dist = levenshtein(pkg, off.toLowerCase());
      if (dist > 0 && dist <= 3) {
        suspicious.push({
          packageName: app.packageName,
          appName: name,
          reason_bn: `প্যাকেজ নাম "${OFFICIAL_APPS[off]}"-এর প্রায় হুবহু নকল`,
          severity: 'high',
          mimics: OFFICIAL_APPS[off],
        });
        matched = true;
        break;
      }
    }
    if (matched) continue;

    // App display-name claims a financial brand but package isn't official
    if (SUSPICIOUS_NAME_RE.test(name)) {
      const brand = name.match(SUSPICIOUS_NAME_RE)?.[0] ?? name;
      suspicious.push({
        packageName: app.packageName,
        appName: name,
        reason_bn: `অ্যাপের নামে "${brand}" আছে কিন্তু অফিসিয়াল প্যাকেজ নয়`,
        severity: 'medium',
        mimics: brand,
      });
    }
  }

  return { available: true, totalScanned: apps.length, officialFound, suspicious };
}
