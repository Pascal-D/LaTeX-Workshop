import * as vscode from 'vscode'
import * as lw from '../lw'
import { StructureUpdated } from '../components/eventbus'
import { buildLaTeX } from './structurelib/latex'
import { buildBibTeX } from './structurelib/bibtex'
import { buildDocTeX } from './structurelib/doctex'

import { getLogger } from '../components/logger'

const logger = getLogger('Structure')

export enum TeXElementType { Environment, Command, Section, SectionAst, BibItem, BibField }

export type TeXElement = {
    readonly type: TeXElementType,
    readonly name: string,
    label: string,
    readonly index: number,
    readonly lineFr: number,
    lineTo: number,
    readonly filePath: string,
    readonly children: TeXElement[],
    parent?: TeXElement
}

export class StructureView implements vscode.TreeDataProvider<TeXElement> {
    private readonly structureChanged: vscode.EventEmitter<TeXElement | undefined | null> = new vscode.EventEmitter<TeXElement | undefined | null>()
    readonly onDidChangeTreeData: vscode.Event<TeXElement | undefined | null>

    public structure: TeXElement[] = []
    private cachedTeX: TeXElement[] | undefined = undefined
    private cachedBib: TeXElement[] | undefined = undefined
    private cachedDTX: TeXElement[] | undefined = undefined

    private readonly viewer: vscode.TreeView<TeXElement | undefined>
    private followCursor: boolean = true

    constructor() {
        this.onDidChangeTreeData = this.structureChanged.event
        this.viewer = vscode.window.createTreeView('latex-workshop-structure', { treeDataProvider: this, showCollapseAll: true })

        vscode.commands.registerCommand('latex-workshop.structure-toggle-follow-cursor', () => {
           this.followCursor = ! this.followCursor
           logger.log(`Follow cursor is set to ${this.followCursor}.`)
        })

        vscode.workspace.onDidSaveTextDocument((e: vscode.TextDocument) => {
            if (lw.manager.hasBibtexId(e.languageId) || lw.manager.hasDoctexId(e.languageId)) {
                void this.reconstruct()
            }
        })

        vscode.window.onDidChangeActiveTextEditor((e: vscode.TextEditor | undefined) => {
            if (e && (lw.manager.hasBibtexId(e.document.languageId) || lw.manager.hasDoctexId(e.document.languageId))) {
                void this.refresh()
            }
        })
    }

    /**
     * Return the latex or bibtex structure
     *
     * @param force If `false` and some cached data exists for the corresponding file, use it. If `true`, always recompute the structure from disk
     */
    async build(force: boolean): Promise<TeXElement[]> {
        const document = vscode.window.activeTextEditor?.document
        if (document?.languageId === 'doctex') {
            if (force || !this.cachedDTX || this.getCachedDataRootFileName(this.cachedDTX) !== document.fileName) {
                this.cachedDTX = undefined
                this.cachedDTX = await buildDocTeX(document)
            }
            this.structure = this.cachedDTX
            logger.log(`Structure updated with ${this.structure.length} entries for ${document.uri.fsPath} .`)
        } else if (document?.languageId === 'bibtex') {
            if (force || !this.cachedBib || this.getCachedDataRootFileName(this.cachedBib) !== document.fileName) {
                this.cachedBib = undefined
                this.cachedBib = await buildBibTeX(document)
            }
            this.structure = this.cachedBib
            logger.log(`Structure updated with ${this.structure.length} entries for ${document.uri.fsPath} .`)
        } else if (lw.manager.rootFile) {
            if (force || !this.cachedTeX) {
                this.cachedTeX = undefined
                this.cachedTeX = await buildLaTeX()
            }
            this.structure = this.cachedTeX
            logger.log(`Structure ${force ? 'force ' : ''}updated with ${this.structure.length} root sections for ${lw.manager.rootFile} .`)
        } else {
            this.structure = []
            logger.log('Structure cleared on undefined root.')
        }
        return this.structure
    }

    async reconstruct() {
        await this.update(true)
        return this.structure
    }

    async refresh() {
        await this.update(false)
        return this.structure
    }

    private async update(force: boolean) {
        this.structure = await this.build(force)
        this.structureChanged.fire(undefined)
        lw.eventBus.fire(StructureUpdated)
    }

    private getCachedDataRootFileName(sections: TeXElement[]): string | undefined {
        return sections[0]?.filePath
    }

    private traverseSectionTree(sections: TeXElement[], filePath: string, lineNo: number): TeXElement | undefined {
        for (const node of sections) {
            if ((node.filePath === filePath &&
                 node.lineFr <= lineNo && node.lineTo >= lineNo) ||
                (node.filePath !== filePath && node.children.map(child => child.filePath).includes(filePath))) {
                // Look for a more precise surrounding section
                return this.traverseSectionTree(node.children, filePath, lineNo) ?? node
            }
        }
        return undefined
    }

    showCursorItem(e: vscode.TextEditorSelectionChangeEvent) {
        if (!this.followCursor || !this.viewer.visible) {
            return
        }
        const line = e.selections[0].active.line
        const f = e.textEditor.document.fileName
        const currentNode = this.traverseSectionTree(this.structure, f, line)
        return currentNode ? this.viewer.reveal(currentNode, {select: true}) : undefined
    }

    getTreeItem(element: TeXElement): vscode.TreeItem {
        const treeItem: vscode.TreeItem = new vscode.TreeItem(
            element.label,
            element.children.length > 0 ? vscode.TreeItemCollapsibleState.Expanded :
                                          vscode.TreeItemCollapsibleState.None)

        treeItem.command = {
            command: 'latex-workshop.goto-section',
            title: '',
            arguments: [element.filePath, element.filePath]
        }
        treeItem.tooltip = `Line ${element.lineFr + 1} at ${element.filePath}`

        return treeItem
    }

    getChildren(element?: TeXElement): vscode.ProviderResult<TeXElement[]> {
        if (lw.manager.rootFile === undefined) {
            return []
        }
        return element?.children ?? this.refresh()
    }

    getParent(element?: TeXElement): TeXElement | undefined {
        if (lw.manager.rootFile === undefined || !element) {
            return
        }
        return element.parent
    }
}
