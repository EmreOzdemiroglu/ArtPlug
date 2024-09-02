import { App, Plugin, PluginSettingTab, Setting, WorkspaceLeaf } from 'obsidian';
import { OutlineView } from './src/views/OutlineView';
import { CreateView } from './src/views/CreateView';
import { RewriteView } from './src/views/RewriteView';
import { ReorderView } from './src/views/ReorderView'; // Import ReorderView

interface ArtPlugSettings {
	borderColor: string;
}

const DEFAULT_SETTINGS: ArtPlugSettings = {
	borderColor: '#FFA500' // Default to orange
}

export default class ArtPlug extends Plugin {
	settings: ArtPlugSettings;

	async onload() {
		await this.loadSettings();

		// Panel oluşturma
		this.registerView(
			'outline-view',
			(leaf: WorkspaceLeaf) => new OutlineView(this.app, leaf, this.settings)
		);

		this.addRibbonIcon('dice', 'Open Outline', () => {
			this.activateView('outline-view');
		});

		// Create panel oluşturma
		this.registerView(
			'create-view',
			(leaf: WorkspaceLeaf) => new CreateView(this.app, leaf, this.settings)
		);

		this.addRibbonIcon('pencil-plus', 'Open Create', () => {
			this.activateView('create-view');
		});

		this.addCommand({
			id: 'open-create-view',
			name: 'Open Create View',
			callback: () => this.activateView('create-view')
		});

		// Rewrite panel oluşturma
		this.registerView(
			'rewrite-view',
			(leaf: WorkspaceLeaf) => new RewriteView(this.app, leaf, this.settings)
		);

		this.addRibbonIcon('edit', 'Open Rewrite', () => {
			this.activateView('rewrite-view');
		});

		this.addCommand({
			id: 'open-rewrite-view',
			name: 'Open Rewrite View',
			callback: () => this.activateView('rewrite-view')
		});

		// Reorder panel oluşturma
		this.registerView(
			'reorder-view',
			(leaf: WorkspaceLeaf) => new ReorderView(this.app, leaf)
			);

		this.addRibbonIcon('list-ordered', 'Open Reorder', () => {
			this.activateView('reorder-view');
		});

		this.addCommand({
			id: 'open-reorder-view',
			name: 'Open Reorder View',
			callback: () => this.activateView('reorder-view')
		});

		this.addSettingTab(new ArtPlugSettingTab(this.app, this));
	}

	onunload() {
		this.app.workspace.detachLeavesOfType('outline-view');
		this.app.workspace.detachLeavesOfType('create-view');
		this.app.workspace.detachLeavesOfType('rewrite-view');
		this.app.workspace.detachLeavesOfType('reorder-view');
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	async activateView(viewType: string) {
		this.app.workspace.detachLeavesOfType(viewType);

		const leaf = this.app.workspace.getRightLeaf(false);
		if (leaf) {
			await leaf.setViewState({
				type: viewType,
				active: true,
			});

			this.app.workspace.revealLeaf(
				this.app.workspace.getLeavesOfType(viewType)[0]
			);
		}
	}
}

class ArtPlugSettingTab extends PluginSettingTab {
	plugin: ArtPlug;

	constructor(app: App, plugin: ArtPlug) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		containerEl.createEl('h2', { text: 'ArtPlug Settings' });

		new Setting(containerEl)
			.setName('Border Color')
			.setDesc('Set the border color for the headers')
			.addText(text => text
				.setPlaceholder('Enter color code')
				.setValue(this.plugin.settings.borderColor)
				.onChange(async (value) => {
					this.plugin.settings.borderColor = value;
					await this.plugin.saveSettings();
				}));
	}
}
