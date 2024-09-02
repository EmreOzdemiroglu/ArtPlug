import { App, ItemView, WorkspaceLeaf } from 'obsidian';

interface ReorderItem {
    type: 'header' | 'sentence';
    content: string;
    originalContent?: string;
}

export class ReorderView extends ItemView {
    app: App;
    containerEl: HTMLElement;
    reorderItems: ReorderItem[] = [];

    constructor(app: App, leaf: WorkspaceLeaf) {
        super(leaf);
        this.app = app;
        this.containerEl.addClass('reorder-view-container');
        this.registerEvent(this.app.vault.on('modify', this.updateView.bind(this)));
        this.registerEvent(this.app.workspace.on('file-open', this.updateView.bind(this)));
    }

    getViewType() {
        return 'reorder-view';
    }

    getDisplayText() {
        return 'Reorder';
    }

    async onOpen() {
        this.updateView();
    }

    async updateView() {
        const container = this.containerEl;
        container.empty();
        container.createEl('h4', { text: 'Reorder' });

        const activeFile = this.app.workspace.getActiveFile();
        if (activeFile) {
            const content = await this.app.vault.read(activeFile);
            this.extractReorderItems(content);
            this.showReorderItems();
        } else {
            container.createEl('div', { text: 'No file open' });
        }
    }

    extractReorderItems(content: string) {
        this.reorderItems = [];
        const lines = content.split('\n');
        let currentHeader: string | undefined = undefined;

        lines.forEach(line => {
            if (line.startsWith('### ')) {
                this.reorderItems.push({
                    type: 'header',
                    content: line.substring(4).trim().toUpperCase(),
                    originalContent: line.trim()
                });
                currentHeader = line.trim();
            } else if (line.trim()) {
                const sentences = line.split(/(?<=\.|\?|\!)\s+/).filter(s => s.trim());
                sentences.forEach(sentence => {
                    this.reorderItems.push({
                        type: 'sentence',
                        content: sentence.trim(),
                        originalContent: currentHeader
                    });
                });
            }
        });
    }

    showReorderItems() {
        const container = this.containerEl;
        const listEl = container.createEl('div', { cls: 'reorder-list' });

        this.reorderItems.forEach((item, index) => {
            const itemEl = listEl.createEl('div', {
                cls: `reorder-item ${item.type === 'header' ? 'header-item' : 'sentence-item'}`,
                attr: { 'data-index': index.toString(), draggable: 'true' }
            });
            itemEl.createEl('span', { text: item.content, cls: 'item-content' });
        });

        this.addDragListeners(listEl);
    }

    addDragListeners(listEl: HTMLElement) {
        let draggedElement: HTMLElement | null = null;

        listEl.addEventListener('dragstart', (event) => {
            if (event.target instanceof HTMLElement) {
                draggedElement = event.target;
                event.dataTransfer?.setData('text/plain', event.target.dataset.index || '');
                setTimeout(() => {
                    if (event.target instanceof HTMLElement) {
                        event.target.classList.add('dragging');
                    }
                }, 0);
            }
        });

        listEl.addEventListener('dragover', (event) => {
            event.preventDefault();
            if (!draggedElement) return;
            
            const closestItem = (event.target as HTMLElement).closest('.reorder-item') as HTMLElement;
            if (closestItem && closestItem !== draggedElement) {
                const rect = closestItem.getBoundingClientRect();
                const midPoint = (rect.top + rect.bottom) / 2;
                if (event.clientY < midPoint) {
                    closestItem.style.borderTop = '2px solid #007bff';
                    closestItem.style.borderBottom = '';
                } else {
                    closestItem.style.borderBottom = '2px solid #007bff';
                    closestItem.style.borderTop = '';
                }
            }
        });

        listEl.addEventListener('dragleave', (event) => {
            if (event.target instanceof HTMLElement) {
                event.target.style.borderTop = '';
                event.target.style.borderBottom = '';
            }
        });

        listEl.addEventListener('drop', async (event) => {
            event.preventDefault();
            if (!draggedElement) return;

            const closestItem = (event.target as HTMLElement).closest('.reorder-item') as HTMLElement;
            if (closestItem && closestItem !== draggedElement) {
                const draggedIndex = parseInt(draggedElement.dataset.index || '0', 10);
                const targetIndex = parseInt(closestItem.dataset.index || '0', 10);
                const rect = closestItem.getBoundingClientRect();
                const midPoint = (rect.top + rect.bottom) / 2;
                const insertAfter = event.clientY > midPoint;

                this.reorderItems = this.reorderItemsArray(draggedIndex, targetIndex, insertAfter);
                await this.updateFileContent();
                this.updateView();
            }
        });

        listEl.addEventListener('dragend', () => {
            if (draggedElement) {
                draggedElement.classList.remove('dragging');
                draggedElement = null;
            }
            listEl.querySelectorAll('.reorder-item').forEach(item => {
                (item as HTMLElement).style.borderTop = '';
                (item as HTMLElement).style.borderBottom = '';
            });
        });
    }

    reorderItemsArray(draggedIndex: number, targetIndex: number, insertAfter: boolean): ReorderItem[] {
        const newItems = [...this.reorderItems];
        const [draggedItem] = newItems.splice(draggedIndex, 1);
        
        if (insertAfter) {
            newItems.splice(targetIndex + 1, 0, draggedItem);
        } else {
            newItems.splice(targetIndex, 0, draggedItem);
        }
        
        return newItems;
    }

    async updateFileContent() {
        const activeFile = this.app.workspace.getActiveFile();
        if (activeFile) {
            let newContent = '';
            let currentHeader = '';

            this.reorderItems.forEach(item => {
                if (item.type === 'header') {
                    if (currentHeader) {
                        newContent += '\n\n';
                    }
                    currentHeader = item.originalContent || item.content;
                    newContent += `${currentHeader}\n\n`;
                } else {
                    newContent += `${item.content} `;
                }
            });

            await this.app.vault.modify(activeFile, newContent.trim());
        }
    }
}