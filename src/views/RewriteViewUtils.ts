import { RewriteView } from './RewriteView';
import { saveSentenceVersions } from './SentenceVersionUtils';

export function showSentences(view: RewriteView, content: string) {
	const container = view.containerEl;
	container.empty();
	container.createEl('h4', { text: 'Sentences' });

	const headers = content.match(/^### .+/gm);
	if (headers) {
		headers.forEach((header, index) => {
			const headerText = header.replace(/^###\s*/, '');
			const headerEl = container.createEl('h3', { text: headerText });

			const headerIndex = content.indexOf(header);
			const nextHeaderIndex = headers[index + 1] ? content.indexOf(headers[index + 1]) : content.length;
			const headerContent = content.substring(headerIndex + header.length, nextHeaderIndex).trim();
			const sentences = headerContent.split('.').filter(sentence => sentence.trim().length > 0);

			sentences.forEach(sentence => {
				const sentenceEl = container.createEl('div', { cls: 'sentence' });
				sentenceEl.createEl('span', { text: sentence.trim(), cls: 'sentence-text' });

				sentenceEl.addEventListener('click', (event) => {
					event.stopPropagation(); // Prevent triggering the click outside handler
					showRewriteOptions(view, header, sentence, content, sentenceEl);
				});
			});
		});
	} else {
		container.createEl('div', { text: 'No headers found' });
	}
}

export function showRewriteOptions(view: RewriteView, header: string, sentence: string, content: string, sentenceEl: HTMLElement) {
	const container = view.containerEl;
	const existingRewriteContainer = container.querySelector('.rewrite-container');
	if (existingRewriteContainer) {
		const previousSentenceEl = (existingRewriteContainer as any).originalSentenceEl as HTMLElement;
		if (previousSentenceEl) {
			existingRewriteContainer.replaceWith(previousSentenceEl);
		}
	}

	const rewriteContainer = document.createElement('div');
	rewriteContainer.classList.add('rewrite-container');

	const originalSentenceEl = document.createElement('div');
	originalSentenceEl.classList.add('original-sentence');
	originalSentenceEl.innerHTML = `<span class="original-sentence-text">${sentence.trim()}</span>`;
	rewriteContainer.appendChild(originalSentenceEl);

	addRewriteOption(view, rewriteContainer, header, sentence, sentence, content);

	const versions = view.sentenceVersions[sentence] || [];
	versions.forEach(version => {
		addRewriteOption(view, rewriteContainer, header, sentence, version, content);
	});

	const addRewriteButton = document.createElement('button');
	addRewriteButton.classList.add('add-rewrite-button');
	addRewriteButton.textContent = '+';
	addRewriteButton.addEventListener('click', () => {
		addRewriteOption(view, rewriteContainer, header, sentence, '', content);
	});
	rewriteContainer.appendChild(addRewriteButton);

	// Replace the sentence element with the rewrite container
	sentenceEl.replaceWith(rewriteContainer);
	(rewriteContainer as any).originalSentenceEl = sentenceEl; // Store the original sentence element

	// Restore the original sentence when clicking outside the rewrite container
	const handleClickOutside = (event: MouseEvent) => {
		if (!rewriteContainer.contains(event.target as Node)) {
			rewriteContainer.replaceWith(sentenceEl);
			document.removeEventListener('click', handleClickOutside);
		}
	};
	setTimeout(() => document.addEventListener('click', handleClickOutside), 0); // Delay adding the event listener to avoid immediate trigger
}

function addRewriteOption(view: RewriteView, container: HTMLElement, header: string, sentence: string, version: string, content: string) {
    const rewriteOptionEl = document.createElement('div');
    rewriteOptionEl.classList.add('rewrite-option');
    if (version === sentence) {
        rewriteOptionEl.classList.add('active');
    }

    const selectCircle = document.createElement('span');
    selectCircle.classList.add('select-circle');
    selectCircle.innerHTML = version === sentence ? '●' : '○';
    rewriteOptionEl.appendChild(selectCircle);

    const rewriteTextarea = document.createElement('textarea');
    rewriteTextarea.classList.add('rewrite-textarea');
    rewriteTextarea.value = version;
    rewriteOptionEl.appendChild(rewriteTextarea);

    const debouncedSave = debounce(async () => {
        const newSentence = rewriteTextarea.value;
        if (!view.sentenceVersions[sentence]) {
            view.sentenceVersions[sentence] = [];
        }
        const index = view.sentenceVersions[sentence].indexOf(version);
        if (index > -1) {
            view.sentenceVersions[sentence][index] = newSentence;
        } else {
            if (!view.sentenceVersions[sentence].includes(newSentence)) {
                view.sentenceVersions[sentence].push(newSentence);
            }
        }
        await saveSentenceVersions(view.app, view.sentenceVersions);
    }, 500);

    rewriteTextarea.addEventListener('input', debouncedSave);

    selectCircle.addEventListener('click', async () => {
        const activeFile = view.app.workspace.getActiveFile();
        if (activeFile) {
            // First, save the current content of the textarea
            await debouncedSave();

            // Now read the updated content and apply the changes
            const content = await view.app.vault.read(activeFile);
            const updatedContent = content.replace(sentence, rewriteTextarea.value);
            await view.app.vault.modify(activeFile, updatedContent);

            // Mark the selected version as active
            container.querySelectorAll('.rewrite-option').forEach(el => el.classList.remove('active'));
            rewriteOptionEl.classList.add('active');

            // Update the sentence versions
            if (!view.sentenceVersions[sentence]) {
                view.sentenceVersions[sentence] = [];
            }
            if (!view.sentenceVersions[sentence].includes(rewriteTextarea.value)) {
                view.sentenceVersions[sentence].push(rewriteTextarea.value);
            }

            // Save the sentence versions
            await saveSentenceVersions(view.app, view.sentenceVersions);

            // Refresh the rewrite options
            showRewriteOptions(view, header, rewriteTextarea.value, updatedContent, container.parentElement as HTMLElement);
        }
        selectCircle.innerHTML = '●';
    });

    const deleteButton = document.createElement('button');
    deleteButton.classList.add('delete-button');
    deleteButton.textContent = 'Delete';
    rewriteOptionEl.appendChild(deleteButton);

    deleteButton.addEventListener('click', async () => {
        const index = view.sentenceVersions[sentence].indexOf(version);
        if (index > -1) {
            view.sentenceVersions[sentence].splice(index, 1);
            await saveSentenceVersions(view.app, view.sentenceVersions);
            rewriteOptionEl.remove();
            showRewriteOptions(view, header, sentence, content, container.parentElement as HTMLElement);
        }
    });

    container.appendChild(rewriteOptionEl);
}

function debounce(func: Function, wait: number) {
	let timeout: number;
	return function (...args: any[]) {
		clearTimeout(timeout);
		timeout = window.setTimeout(() => func.apply(this, args), wait);
	};
}