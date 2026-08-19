const express = require('express');
const mongoose = require('mongoose');
const User = require('../models/User');
const Task = require('../models/Task');
const { authenticate, authorize } = require('../middleware/auth');
const { emitUsersChanged } = require('../realtime');

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

function buildUserScope(user) {
  if (user.role === 'Team Lead') {
    return { $or: [{ _id: user._id }, { teamLead: user._id }] };
  }

  if (user.role === 'Employee') {
    return { _id: user._id };
  }

  return {};
}

function buildSearchFilter(query) {
  const search = String(query.search || '').trim();

  if (!search) {
    return {};
  }

  const searchRegex = new RegExp(escapeRegex(search), 'i');

  return {
    $or: [{ username: searchRegex }, { email: searchRegex }]
  };
}

function hasFilter(filter) {
  return Object.keys(filter).length > 0;
}

function combineFilters(...filters) {
  const activeFilters = filters.filter(hasFilter);

  if (activeFilters.length === 0) {
    return {};
  }

  if (activeFilters.length === 1) {
    return activeFilters[0];
  }

  return { $and: activeFilters };
}

async function findPagedUsers(req, extraFilter = {}) {
  const { page, limit, skip } = getPagination(req.query);
  const filter = combineFilters(buildUserScope(req.user), buildSearchFilter(req.query), extraFilter);

  const [items, total] = await Promise.all([
    User.find(filter)
      .select('-password')
      .populate('teamLead', 'username email role')
      .sort({ role: 1, username: 1 })
      .skip(skip)
      .limit(limit),
    User.countDocuments(filter)
  ]);

  return {
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
}

router.get('/', async (req, res, next) => {
  try {
    const extraFilter = {};

    if (['Manager', 'Team Lead', 'Employee'].includes(req.query.role)) {
      extraFilter.role = req.query.role;
    }

    const data = await findPagedUsers(req, extraFilter);

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.get('/assignable', async (req, res, next) => {
  try {
    const data = await findPagedUsers(req);

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.get('/team-leads-with-tasks', authorize('Manager'), async (req, res, next) => {
  try {
    const leads = await User.find({ role: 'Team Lead' }).select('-password').sort({ username: 1 });
    const leadIds = leads.map((lead) => lead._id);
    const members = await User.find({ teamLead: { $in: leadIds } }).select('_id teamLead');
    const userIdsByLead = new Map(leads.map((lead) => [String(lead._id), [String(lead._id)]]));

    members.forEach((member) => {
      const leadId = String(member.teamLead);
      userIdsByLead.get(leadId)?.push(String(member._id));
    });

    const allScopedUserIds = [...new Set([...userIdsByLead.values()].flat())];
    const tasks = await Task.find({ assignedTo: { $in: allScopedUserIds } })
      .populate('createdBy assignedTo', 'username email role')
      .sort({ updatedAt: -1 });

    const data = leads.map((lead) => {
      const scopedIds = userIdsByLead.get(String(lead._id)) || [];

      return {
        ...lead.toJSON(),
        tasks: tasks.filter((task) => scopedIds.includes(String(task.assignedTo._id)))
      };
    });

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.patch('/:id', authorize('Manager'), async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid user id' });
    }

    const updates = {};
    ['username', 'role', 'teamLead'].forEach((field) => {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        updates[field] = req.body[field];
      }
    });

    if (updates.role && updates.role !== 'Employee') {
      updates.teamLead = null;
    }

    if (updates.teamLead) {
      const lead = await User.findOne({ _id: updates.teamLead, role: 'Team Lead' });
      if (!lead) {
        return res.status(400).json({ success: false, message: 'Selected team lead is invalid' });
      }
    }

    const user = await User.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true
    }).populate('teamLead', 'username email role');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    emitUsersChanged(req, 'updated', user._id);
    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
