import { App } from 'obsidian';

export interface SentenceVersions {
	[sentence: string]: string[];
}

export async function loadSentenceVersions(app: App): Promise<SentenceVersions> {
	const filePath = `${app.vault.configDir}/.savedsentenceversions`;
	if (await app.vault.adapter.exists(filePath)) {
		const data = await app.vault.adapter.read(filePath);
		return JSON.parse(data);
	}
	return {};
}

export async function saveSentenceVersions(app: App, sentenceVersions: SentenceVersions) {
	const filePath = `${app.vault.configDir}/.savedsentenceversions`;
	await app.vault.adapter.write(filePath, JSON.stringify(sentenceVersions, null, 2));
}