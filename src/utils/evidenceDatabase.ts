export const EVIDENCE_DATABASE_NAME = "bug-bounty-report-evidence";
export const EVIDENCE_DATABASE_VERSION = 2;
const DATABASE_NAME = EVIDENCE_DATABASE_NAME;
const STORE_NAME = "evidence-files";
const REVISION_STORE_NAME = "evidence-revisions";

export interface StoredEvidenceFile {
  evidenceId: string;
  reportId: string;
  fileName: string;
  mimeType: string;
  blob: Blob;
  createdAt: string;
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error("IndexedDB is not available in this browser."));
      return;
    }
    const request = window.indexedDB.open(
      DATABASE_NAME,
      EVIDENCE_DATABASE_VERSION,
    );
    request.onerror = () =>
      reject(request.error ?? new Error("Unable to open evidence storage."));
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        const store = database.createObjectStore(STORE_NAME, {
          keyPath: "evidenceId",
        });
        store.createIndex("reportId", "reportId", { unique: false });
      }
      if (!database.objectStoreNames.contains(REVISION_STORE_NAME)) {
        const revisions = database.createObjectStore(REVISION_STORE_NAME, {
          keyPath: "id",
        });
        revisions.createIndex("evidenceId", "evidenceId", { unique: false });
        revisions.createIndex("reportId", "reportId", { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
  });
}

function completeTransaction<T>(
  transaction: IDBTransaction,
  request: IDBRequest<T>,
): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onerror = () =>
      reject(request.error ?? new Error("Evidence storage operation failed."));
    transaction.onerror = () =>
      reject(
        transaction.error ?? new Error("Evidence storage operation failed."),
      );
    request.onsuccess = () => resolve(request.result);
  });
}

export async function saveEvidenceFile(
  reportId: string,
  evidenceId: string,
  file: File,
): Promise<void> {
  const database = await openDatabase();
  try {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    const request = transaction
      .objectStore(STORE_NAME)
      .put({
        evidenceId,
        reportId,
        fileName: file.name,
        mimeType: file.type,
        blob: file,
        createdAt: new Date().toISOString(),
      } satisfies StoredEvidenceFile);
    await completeTransaction(transaction, request);
  } finally {
    database.close();
  }
}

export async function getEvidenceFile(
  evidenceId: string,
): Promise<StoredEvidenceFile | undefined> {
  const database = await openDatabase();
  try {
    const transaction = database.transaction(STORE_NAME, "readonly");
    return await completeTransaction(
      transaction,
      transaction.objectStore(STORE_NAME).get(evidenceId),
    );
  } finally {
    database.close();
  }
}

export async function getEvidenceFilesForReport(
  reportId: string,
): Promise<StoredEvidenceFile[]> {
  const database = await openDatabase();
  try {
    const transaction = database.transaction(STORE_NAME, "readonly");
    return await completeTransaction(
      transaction,
      transaction.objectStore(STORE_NAME).index("reportId").getAll(reportId),
    );
  } finally {
    database.close();
  }
}

export async function deleteEvidenceFile(evidenceId: string): Promise<void> {
  const database = await openDatabase();
  try {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    await completeTransaction(
      transaction,
      transaction.objectStore(STORE_NAME).delete(evidenceId),
    );
  } finally {
    database.close();
  }
}

export async function deleteEvidenceFilesForReport(
  reportId: string,
): Promise<void> {
  const files = await getEvidenceFilesForReport(reportId);
  await Promise.all(files.map((file) => deleteEvidenceFile(file.evidenceId)));
}

export async function getAllEvidenceFiles(): Promise<StoredEvidenceFile[]> {
  const database = await openDatabase();
  try {
    const transaction = database.transaction(STORE_NAME, "readonly");
    return await completeTransaction(
      transaction,
      transaction.objectStore(STORE_NAME).getAll(),
    );
  } finally {
    database.close();
  }
}

export async function saveEvidenceBlob(
  file: StoredEvidenceFile,
): Promise<void> {
  const database = await openDatabase();
  try {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    await completeTransaction(
      transaction,
      transaction.objectStore(STORE_NAME).put(file),
    );
  } finally {
    database.close();
  }
}

export async function deleteAllEvidenceFiles(): Promise<void> {
  const database = await openDatabase();
  try {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    await completeTransaction(
      transaction,
      transaction.objectStore(STORE_NAME).clear(),
    );
  } finally {
    database.close();
  }
}

export async function evidenceDatabaseCounts(): Promise<{
  files: number;
  revisions: number;
}> {
  const database = await openDatabase();
  try {
    const transaction = database.transaction(
      [STORE_NAME, REVISION_STORE_NAME],
      "readonly",
    );
    const count = (store: string) =>
      new Promise<number>((resolve, reject) => {
        const request = transaction.objectStore(store).count();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    const [files, revisions] = await Promise.all([
      count(STORE_NAME),
      count(REVISION_STORE_NAME),
    ]);
    return { files, revisions };
  } finally {
    database.close();
  }
}
