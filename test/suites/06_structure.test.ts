import * as vscode from 'vscode'
import * as path from 'path'
import * as assert from 'assert'
import * as lw from '../../src/lw'
import * as test from './utils'

async function loadTestFiles(fixture: string) {
    await test.load(fixture, [
        {src: 'structure_base.tex', dst: 'main.tex'},
        {src: 'structure_sub.tex', dst: 'sub/s.tex'},
        {src: 'structure_s2.tex', dst: 'sub/s2.tex'},
        {src: 'structure_s3.tex', dst: 'sub/s3.tex'}
    ], {open: 0})
}

suite('Document structure test suite', () => {
    test.suite.name = path.basename(__filename).replace('.test.js', '')
    test.suite.fixture = 'testground'

    suiteSetup(async () => {
        await vscode.commands.executeCommand('latex-workshop.activate')
        await vscode.workspace.getConfiguration('latex-workshop').update('latex.autoBuild.run', 'never')
    })

    teardown(async () => {
        await test.reset()

        await vscode.workspace.getConfiguration('latex-workshop').update('view.outline.numbers.enabled', undefined)
        await vscode.workspace.getConfiguration('latex-workshop').update('view.outline.sections', undefined)
        await vscode.workspace.getConfiguration('latex-workshop').update('view.outline.floats.enabled', undefined)
        await vscode.workspace.getConfiguration('latex-workshop').update('view.outline.floats.number.enabled', undefined)
        await vscode.workspace.getConfiguration('latex-workshop').update('view.outline.floats.caption.enabled', undefined)
    })

    test.run('test structure', async (fixture: string) => {
        await loadTestFiles(fixture)
        const sections = await lw.structureViewer.reconstruct()
        assert.ok(sections)
        assert.strictEqual(sections.length, 6)
        assert.strictEqual(sections[0].children.length, 3)
        assert.strictEqual(sections[0].children[1].children.length, 2)
        assert.strictEqual(sections[0].children[1].children[0].label, '#label: sec11')
        assert.strictEqual(sections[0].children[1].children[0].lineFr, 5)
        assert.strictEqual(sections[1].children.length, 1)
        assert.strictEqual(sections[1].children[0].label, '2.0.1 2.0.1')
        assert.strictEqual(sections[3].label, '4 4 A long title split over two lines')
        assert.strictEqual(sections[4].label, '* No \\textit{Number} Section')
        assert.strictEqual(sections[5].label, '5 Section pdf Caption')
        assert.strictEqual(sections[5].children[0].label, 'Figure 1')
        assert.strictEqual(sections[5].children[1].label, 'Figure 2: Figure Caption')
        assert.strictEqual(sections[5].children[2].label, 'Table 1: Table Caption')
        assert.strictEqual(sections[5].children[3].label, 'Frame 1: Frame Title 1')
        assert.strictEqual(sections[5].children[4].label, 'Frame 2: Frame Title 2')
        assert.strictEqual(sections[5].children[5].label, 'Frame 3')
    })

    test.run('test structure with nested floats', async (fixture: string) => {
        await test.load(fixture, [
            {src: 'structure_nested.tex', dst: 'main.tex'}
        ], {open: 0})
        const sections = await lw.structureViewer.reconstruct()
        assert.ok(sections)
        assert.strictEqual(sections.length, 3)
        assert.strictEqual(sections[0].children.length, 1)
        assert.strictEqual(sections[0].children[0].children.length, 1)
    })

    test.run('test view.outline.numbers.enabled', async (fixture: string) => {
        await loadTestFiles(fixture)
        await vscode.workspace.getConfiguration('latex-workshop').update('view.outline.numbers.enabled', false)
        const sections = await lw.structureViewer.reconstruct()
        assert.ok(sections)
        assert.strictEqual(sections[1].children[0].label, '2.0.1')
    })

    test.run('test view.outline.sections', async (fixture: string) => {
        await loadTestFiles(fixture)
        await vscode.workspace.getConfiguration('latex-workshop').update('view.outline.sections', ['section', 'altsection', 'subsubsection'])
        const sections = await lw.structureViewer.reconstruct()
        assert.ok(sections)
        assert.strictEqual(sections[0].children.length, 2)
        assert.strictEqual(sections[0].children[1].label, '1.1 1.1?')
    })

    test.run('test view.outline.floats.enabled', async (fixture: string) => {
        await loadTestFiles(fixture)
        await vscode.workspace.getConfiguration('latex-workshop').update('view.outline.floats.enabled', false)
        const sections = await lw.structureViewer.reconstruct()
        assert.ok(sections)
        assert.strictEqual(sections[5].children.length, 3)
        assert.strictEqual(sections[5].children[0].label, 'Frame 1: Frame Title 1')
        assert.strictEqual(sections[5].children[1].label, 'Frame 2: Frame Title 2')
        assert.strictEqual(sections[5].children[2].label, 'Frame 3')
    })

    test.run('test view.outline.floats.number.enabled', async (fixture: string) => {
        await loadTestFiles(fixture)
        await vscode.workspace.getConfiguration('latex-workshop').update('view.outline.floats.number.enabled', false)
        const sections = await lw.structureViewer.reconstruct()
        assert.ok(sections)
        assert.strictEqual(sections[5].children.length, 6)
        assert.strictEqual(sections[5].children[0].label, 'Figure')
        assert.strictEqual(sections[5].children[1].label, 'Figure: Figure Caption')
        assert.strictEqual(sections[5].children[2].label, 'Table: Table Caption')
        assert.strictEqual(sections[5].children[3].label, 'Frame: Frame Title 1')
        assert.strictEqual(sections[5].children[4].label, 'Frame: Frame Title 2')
        assert.strictEqual(sections[5].children[5].label, 'Frame')
    })

    test.run('test view.outline.floats.caption.enabled', async (fixture: string) => {
        await loadTestFiles(fixture)
        await vscode.workspace.getConfiguration('latex-workshop').update('view.outline.floats.caption.enabled', false)
        const sections = await lw.structureViewer.reconstruct()
        assert.ok(sections)
        assert.strictEqual(sections[5].children.length, 6)
        assert.strictEqual(sections[5].children[0].label, 'Figure 1')
        assert.strictEqual(sections[5].children[1].label, 'Figure 2')
        assert.strictEqual(sections[5].children[2].label, 'Table 1')
        assert.strictEqual(sections[5].children[3].label, 'Frame 1')
        assert.strictEqual(sections[5].children[4].label, 'Frame 2')
        assert.strictEqual(sections[5].children[5].label, 'Frame 3')
    })
})
