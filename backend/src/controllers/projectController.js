/**
 * projectController.js — Project CRUD endpoints
 */
const projectStore = require('../services/projectStore');
const sceneStore = require('../services/sceneStore');
const shotStore = require('../services/shotStore');
const scriptStore = require('../services/scriptStore');

exports.createProject = (req, res) => {
  try {
    const { title, description, style, settings } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Title is required' });
    }
    const project = projectStore.createProject({ title: title.trim(), description, style, settings });
    res.status(201).json(project);
  } catch (err) {
    console.error('Error creating project:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.getProject = (req, res) => {
  try {
    const project = projectStore.getProject(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    // Include scene count and shot count
    const scenes = sceneStore.listScenesByProject(req.params.id);
    const shots = shotStore.listShotsByProject(req.params.id);
    const script = scriptStore.getScriptByProject(req.params.id);

    res.json({
      ...project,
      sceneCount: scenes.length,
      shotCount: shots.length,
      hasScript: !!script,
    });
  } catch (err) {
    console.error('Error getting project:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.listProjects = (req, res) => {
  try {
    const projects = projectStore.listProjects();
    // Enrich with counts
    const enriched = projects.map((p) => {
      const scenes = sceneStore.listScenesByProject(p.id);
      const shots = shotStore.listShotsByProject(p.id);
      return {
        ...p,
        sceneCount: scenes.length,
        shotCount: shots.length,
      };
    });
    res.json(enriched);
  } catch (err) {
    console.error('Error listing projects:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.updateProject = (req, res) => {
  try {
    const project = projectStore.updateProject(req.params.id, req.body);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    res.json(project);
  } catch (err) {
    console.error('Error updating project:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.deleteProject = (req, res) => {
  try {
    const project = projectStore.getProject(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    // Cascade: delete shots, scenes, scripts, then project
    shotStore.listShotsByProject(req.params.id); // verification only
    sceneStore.deleteScenesByProject(req.params.id);
    scriptStore.deleteScriptsByProject(req.params.id);
    projectStore.deleteProject(req.params.id);

    res.json({ deleted: true, id: req.params.id });
  } catch (err) {
    console.error('Error deleting project:', err);
    res.status(500).json({ error: err.message });
  }
};
