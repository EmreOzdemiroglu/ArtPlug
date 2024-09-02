import { App, ItemView, WorkspaceLeaf } from 'obsidian';

export class OutlineView extends ItemView {
	app: App;
	containerEl: HTMLElement;
	settings: { borderColor: string };

	constructor(app: App, leaf: WorkspaceLeaf, settings: { borderColor: string }) {
		super(leaf);
		this.app = app;
		this.settings = settings;
		this.containerEl = this.contentEl; // Correctly assign containerEl
		this.registerEvent(this.app.vault.on('modify', this.updateView.bind(this)));
		this.registerEvent(this.app.workspace.on('file-open', this.updateView.bind(this)));
	}

	getViewType() {
		return 'outline-view';
	}

	getDisplayText() {
		return 'Outline';
	}

	async onOpen() {
		this.updateView();
	}

	async updateView() {
		const container = this.containerEl;
		container.empty();
		container.createEl('h4', { text: 'Outline' });

		// Başlıkları tarama ve gösterme
		const activeFile = this.app.workspace.getActiveFile();
		if (activeFile) {
			const content = await this.app.vault.read(activeFile);
			const headers = content.match(/^### .+/gm);
			if (headers) {
				headers.forEach((header: string, index: number) => {
					const headerText = header.replace(/^###\s*/, '');
					const headerEl = container.createEl('div', { cls: 'header' });
					headerEl.createEl('span', { text: headerText, cls: 'header-text' });
					const toggleEl = headerEl.createEl('button', { text: '▼', cls: 'toggle' });

					const contentEl = container.createEl('div', { cls: 'content hidden' });
					const nextHeaderIndex = headers[index + 1] ? content.indexOf(headers[index + 1]) : content.length;
					const contentText = content.substring(content.indexOf(header) + header.length, nextHeaderIndex).trim();
					const contentTextarea = contentEl.createEl('textarea', { text: contentText, cls: 'content-textarea' });
					const applyButton = contentEl.createEl('button', { text: 'Apply', cls: 'apply-button' });

					toggleEl.addEventListener('click', () => {
						const isHidden = contentEl.hasClass('hidden');
						contentEl.toggleClass('hidden', !isHidden);
						toggleEl.textContent = isHidden ? '▲' : '▼';
					});

					applyButton.addEventListener('click', async () => {
						const newText = contentTextarea.value;
						const updatedContent = content.substring(0, content.indexOf(header) + header.length) + '\n' + newText + '\n' + content.substring(nextHeaderIndex);
						await this.app.vault.modify(activeFile, updatedContent);
						this.updateView(); // Aynı ekranda kal
					});
				});
			} else {
				container.createEl('div', { text: 'No headers found' });
			}
		} else {
			container.createEl('div', { text: 'No file open' });
		}

		// Apply border color from settings
		this.containerEl.querySelectorAll('.header').forEach(header => {
			(header as HTMLElement).style.border = `1px solid ${this.settings.borderColor}`;
		});
	}

	async onClose() {
		this.containerEl.empty(); // Cleanup the container
	}
}