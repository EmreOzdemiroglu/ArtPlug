import { App, ItemView, WorkspaceLeaf } from 'obsidian';
import { SentenceVersions, loadSentenceVersions, saveSentenceVersions } from './SentenceVersionUtils';
import { showSentences } from './RewriteViewUtils';

export class RewriteView extends ItemView {
	app: App;
	containerEl: HTMLElement;
	settings: { borderColor: string };
	sentenceVersions: SentenceVersions = {};

	constructor(app: App, leaf: WorkspaceLeaf, settings: { borderColor: string }) {
		super(leaf);
		this.app = app;
		this.settings = settings;
		this.containerEl.addClass('rewrite-view-container'); // Add this line
		this.registerEvent(this.app.vault.on('modify', this.updateView.bind(this)));
		this.registerEvent(this.app.workspace.on('file-open', this.updateView.bind(this)));
	}

	getViewType() {
		return 'rewrite-view';
	}

	getDisplayText() {
		return 'Rewrite';
	}

	async onOpen() {
		this.sentenceVersions = await loadSentenceVersions(this.app);
		this.updateView();
	}

	async updateView() {
		const container = this.containerEl;
		container.empty();
		container.createEl('h4', { text: 'Rewrite' });

		const activeFile = this.app.workspace.getActiveFile();
		if (activeFile) {
			const content = await this.app.vault.read(activeFile);
			showSentences(this, content);
		} else {
			container.createEl('div', { text: 'No file open' });
		}
	}
}