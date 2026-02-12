/**
 * exportController.js — Export endpoints (PDF, PNG, JSON)
 */
const exportService = require('../services/exportService');
const exportStore = require('../services/exportStore');

exports.exportPDF = async (req, res) => {
  try {
    const { pid } = req.params;
    const settings = req.body || {};

    const record = exportStore.createExport({ projectId: pid, format: 'pdf', settings });

    try {
      const result = await exportService.generatePDF(pid, settings);
      exportStore.updateExport(record.id, { status: 'completed', fileUrl: result.url });
      res.json({ id: record.id, ...result });
    } catch (err) {
      exportStore.updateExport(record.id, { status: 'failed' });
      throw err;
    }
  } catch (err) {
    console.error('Error exporting PDF:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.exportPNG = async (req, res) => {
  try {
    const { pid } = req.params;

    const record = exportStore.createExport({ projectId: pid, format: 'png-zip' });

    try {
      const result = await exportService.generatePNGSequence(pid);
      exportStore.updateExport(record.id, { status: 'completed', fileUrl: result.url });
      res.json({ id: record.id, ...result });
    } catch (err) {
      exportStore.updateExport(record.id, { status: 'failed' });
      throw err;
    }
  } catch (err) {
    console.error('Error exporting PNG:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.exportJSON = async (req, res) => {
  try {
    const { pid } = req.params;

    const record = exportStore.createExport({ projectId: pid, format: 'json' });

    try {
      const result = exportService.generateProjectJSON(pid);
      exportStore.updateExport(record.id, { status: 'completed', fileUrl: result.url });
      res.json({ id: record.id, filename: result.filename, url: result.url, data: result.data });
    } catch (err) {
      exportStore.updateExport(record.id, { status: 'failed' });
      throw err;
    }
  } catch (err) {
    console.error('Error exporting JSON:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.importJSON = async (req, res) => {
  try {
    const { data } = req.body;
    if (!data || !data.project) {
      return res.status(400).json({ error: 'Invalid import data. Expected { data: { project, scenes, ... } }' });
    }

    const project = exportService.importProjectJSON(data);
    res.json({ project, message: 'Project imported successfully' });
  } catch (err) {
    console.error('Error importing JSON:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.listExports = (req, res) => {
  try {
    const exports = exportStore.listByProject(req.params.pid);
    res.json(exports);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.downloadExport = (req, res) => {
  try {
    const record = exportStore.getExport(req.params.exportId);
    if (!record) return res.status(404).json({ error: 'Export not found' });
    if (!record.fileUrl) return res.status(404).json({ error: 'Export file not ready' });

    const filepath = require('path').join(__dirname, '../../data', record.fileUrl);
    if (!require('fs').existsSync(filepath)) {
      return res.status(404).json({ error: 'Export file not found on disk' });
    }

    res.download(filepath);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
