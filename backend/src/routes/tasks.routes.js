const express = require('express');
const mongoose = require('mongoose');
const User = require('../models/User');
const Task = require('../models/Task');
const { authenticate } = require('../middleware/auth');
const { emitTaskChanged } = require('../realtime');

const router = express.Router();

router.use(authenticate);

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 5;
const MAX_LIMIT = 50;

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getPagination(query) {
  const page = Math.max(parseInt(query.page, 10) || DEFAULT_PAGE, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || DEFAULT_LIMIT, 1), MAX_LIMIT);

  return {
    page,
    limit,
    skip: (page - 1) * limit
  };
}

function buildTaskSearchFilter(query) {
  const search = String(query.search || '').trim();

  if (!search) {
    return {};
  }

  const searchRegex = new RegExp(escapeRegex(search), 'i');

  return {
    $or: [{ title: searchRegex }, { description: searchRegex }]
  };
}

async function getAssignableUserIds(user) {
  if (user.role === 'Manager') {
    const users = await User.find().select('_id');
    return users.map((item) => String(item._id));
  }

  if (user.role === 'Team Lead') {
    const users = await User.find({ $or: [{ _id: user._id }, { teamLead: user._id }] }).select('_id');
    return users.map((item) => String(item._id));
  }

  return [String(user._id)];
}

async function buildTaskScope(user) {
  if (user.role === 'Manager') {
    return {};
  }

  const assignableUserIds = await getAssignableUserIds(user);
  return {
    assignedTo: { $in: assignableUserIds }
  };
}

async function canAssignTo(user, assignedTo) {
  const assignableUserIds = await getAssignableUserIds(user);
  return assignableUserIds.includes(String(assignedTo));
}

async function findVisibleTask(user, taskId) {
  if (!mongoose.Types.ObjectId.isValid(taskId)) {
    return null;
  }

  const scope = await buildTaskScope(user);
  return Task.findOne({ _id: taskId, ...scope });
}

router.get('/', async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const scope = await buildTaskScope(req.user);
    const filter = { ...scope, ...buildTaskSearchFilter(req.query) };

    if (['pending', 'completed'].includes(req.query.status)) {
      filter.status = req.query.status;
    }

    const [items, total] = await Promise.all([
      Task.find(filter)
        .populate('createdBy assignedTo', 'username email role')
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit),
      Task.countDocuments(filter)
    ]);

    const data = {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(Math.ceil(total / limit), 1),
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1
      }
    };

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.get('/stats', async (req, res, next) => {
  try {
    const scope = await buildTaskScope(req.user);
    const [total, pending, completed] = await Promise.all([
      Task.countDocuments(scope),
      Task.countDocuments({ ...scope, status: 'pending' }),
      Task.countDocuments({ ...scope, status: 'completed' })
    ]);

    res.json({ success: true, data: { total, pending, completed } });
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { title, description = '', status = 'pending' } = req.body;
    let assignedTo = req.body.assignedTo || req.user._id;

    if (req.user.role === 'Employee') {
      assignedTo = req.user._id;
    }

    if (!(await canAssignTo(req.user, assignedTo))) {
      return res.status(403).json({ success: false, message: 'You cannot assign tasks to that user' });
    }

    const task = await Task.create({
      title,
      description,
      status,
      createdBy: req.user._id,
      assignedTo
    });

    const populatedTask = await task.populate('createdBy assignedTo', 'username email role');
    emitTaskChanged(req, 'created', task._id);
    res.status(201).json({ success: true, data: populatedTask });
  } catch (error) {
    next(error);
  }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const task = await findVisibleTask(req.user, req.params.id);

    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    const updates = {};
    ['title', 'description', 'status'].forEach((field) => {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        updates[field] = req.body[field];
      }
    });

    if (Object.prototype.hasOwnProperty.call(req.body, 'assignedTo')) {
      if (req.user.role === 'Employee') {
        return res.status(403).json({ success: false, message: 'Employees cannot reassign tasks' });
      }

      if (!(await canAssignTo(req.user, req.body.assignedTo))) {
        return res.status(403).json({ success: false, message: 'You cannot assign tasks to that user' });
      }

      updates.assignedTo = req.body.assignedTo;
    }

    Object.assign(task, updates);
    await task.save();
    const populatedTask = await task.populate('createdBy assignedTo', 'username email role');

    emitTaskChanged(req, 'updated', task._id);
    res.json({ success: true, data: populatedTask });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const task = await findVisibleTask(req.user, req.params.id);

    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    await task.deleteOne();
    emitTaskChanged(req, 'deleted', req.params.id);
    res.json({ success: true, data: { id: req.params.id } });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
