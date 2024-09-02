import { App, ItemView, WorkspaceLeaf } from 'obsidian';

export class CreateView extends ItemView {
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
		return 'create-view';
	}

	getDisplayText() {
		return 'Create';
	}

	async onOpen() {
		this.updateView();
	}

	async updateView() {
		const container = this.containerEl;
		container.empty();
		const headerContainer = container.createEl('div', { cls: 'create-header-container' });
		headerContainer.createEl('h2', { text: 'Create' });
		const toggleAllButton = headerContainer.createEl('button', { cls: 'toggle-all-button', attr: { 'aria-label': 'Toggle all sections' } });
		toggleAllButton.innerHTML = '&#x25BC;'; // Down arrow

		let allExpanded = true;
		toggleAllButton.addEventListener('click', () => {
			allExpanded = !allExpanded;
			toggleAllButton.innerHTML = allExpanded ? '&#x25BC;' : '&#x25B2;';
			this.containerEl.querySelectorAll('.create-content').forEach(content => {
				content.toggleClass('hidden', !allExpanded);
			});
			this.containerEl.querySelectorAll('.toggle-button').forEach(button => {
				(button as HTMLElement).textContent = allExpanded ? '▼' : '▲';
			});
		});

		const activeFile = this.app.workspace.getActiveFile();
		if (activeFile) {
			const content = await this.app.vault.read(activeFile);
			const headers = content.match(/^### .+/gm);
			if (headers) {
				headers.forEach((header: string, index: number) => {
					const headerText = header.replace(/^###\s*/, '');
					const sectionEl = container.createEl('div', { cls: 'create-section' });
					const headerEl = sectionEl.createEl('div', { cls: 'create-header' });
					headerEl.createEl('span', { text: headerText, cls: 'header-text' });
					const toggleEl = headerEl.createEl('button', { text: '▼', cls: 'toggle-button' });

					const contentEl = sectionEl.createEl('div', { cls: 'create-content' });
					const nextHeaderIndex = headers[index + 1] ? content.indexOf(headers[index + 1]) : content.length;
					const contentText = content.substring(content.indexOf(header) + header.length, nextHeaderIndex).trim();
					const contentTextarea = contentEl.createEl('textarea', { text: contentText, cls: 'content-textarea' });
					const applyButton = contentEl.createEl('button', { text: 'Apply', cls: 'apply-button' });

					toggleEl.addEventListener('click', () => {
						const isHidden = contentEl.hasClass('hidden');
						contentEl.toggleClass('hidden', !isHidden);
						toggleEl.textContent = isHidden ? '▼' : '▲';
					});

					applyButton.addEventListener('click', async () => {
						const newText = contentTextarea.value;
						const updatedContent = content.substring(0, content.indexOf(header) + header.length) + '\n\n' + newText + '\n\n' + content.substring(nextHeaderIndex);
						await this.app.vault.modify(activeFile, updatedContent);
						this.updateView();
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