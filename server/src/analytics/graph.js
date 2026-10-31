
import Employee from "../models/Employee.js";
import Skill from "../models/Skill.js";
import Role from "../models/Role.js";
import Project from "../models/Project.js";
import Course from "../models/Course.js";
import { AppError, isValidId } from "../utils/http.js";

const MAX_NODES = 120;

function validateId(id) {
  if (!isValidId(id)) {
    throw new AppError(400, "BAD_REQUEST", "Invalid MongoDB ID");
  }
}

function makeGraph(limit = MAX_NODES) {
  const nodes = [];
  const links = [];
  const nodeIds = new Set();
  const linkIds = new Set();

  function addNode(type, id, label) {
    if (!id) return null;

    const key = `${type}:${String(id)}`;

    if (!nodeIds.has(key)) {
      if (nodes.length >= limit) return null;

      nodeIds.add(key);
      nodes.push({
        id: key,
        label: String(label),
        type,
      });
    }

    return key;
  }

  function addLink(source, target, label) {
    if (!source || !target) return;

    const key = `${source}|${target}|${label}`;

    if (!linkIds.has(key)) {
      linkIds.add(key);
      links.push({ source, target, label });
    }
  }

  return {
    nodes,
    links,
    addNode,
    addLink,
  };
}

function skillNode(graph, skill) {
  if (!skill) return null;
  return graph.addNode("skill", skill._id, skill.name);
}

function roleNode(graph, role) {
  if (!role) return null;
  return graph.addNode("role", role._id, role.title);
}

function employeeNode(graph, employee) {
  if (!employee) return null;

  return graph.addNode(
    "employee",
    employee._id,
    employee.name
  );
}

function courseNode(graph, course) {
  if (!course) return null;

  return graph.addNode(
    "course",
    course._id,
    course.title
  );
}

function projectNode(graph, project) {
  if (!project) return null;

  return graph.addNode(
    "project",
    project._id,
    project.name
  );
}

function addRoleRequirements(graph, role, roleKey) {
  for (const item of role.requiredSkills || []) {
    const key = skillNode(graph, item.skillId);
    graph.addLink(roleKey, key, "REQUIRES");
  }

  for (const item of role.futureSkills || []) {
    const key = skillNode(graph, item.skillId);
    graph.addLink(roleKey, key, "FUTURE_REQUIRES");
  }
}

// G1 — GET /graph/employee/:id
export async function employeeGraph(id) {
  validateId(id);

  const employee = await Employee.findById(id)
    .populate("roleId")
    .populate("skills.skillId")
    .lean();

  if (!employee) {
    throw new AppError(
      404,
      "NOT_FOUND",
      "Employee not found"
    );
  }

  const graph = makeGraph();

  const empKey = employeeNode(graph, employee);
  const role = employee.roleId;
  const roleKey = roleNode(graph, role);

  graph.addLink(empKey, roleKey, "HOLDS_ROLE");

  // Current employee skills
  const skillLevels = new Map();

  for (const item of employee.skills || []) {
    const skill = item.skillId;
    if (!skill) continue;

    skillLevels.set(String(skill._id), item.level);

    const key = skillNode(graph, skill);
    graph.addLink(empKey, key, "HAS_SKILL");
  }

  // Role requirements and future requirements
  if (role) {
    await Role.populate(role, [
      { path: "requiredSkills.skillId" },
      { path: "futureSkills.skillId" },
    ]);

    addRoleRequirements(graph, role, roleKey);
  }

  // Employee project memberships
  const projects = await Project.find({
    members: employee._id,
  }).lean();

  for (const project of projects) {
    const key = projectNode(graph, project);
    graph.addLink(empKey, key, "MEMBER_OF");
  }

  // Identify skills below the role's required level
  const gaps = new Set();

  for (const item of role?.requiredSkills || []) {
    if (!item.skillId) continue;

    const current =
      skillLevels.get(String(item.skillId._id)) || 0;

    if (current < item.level) {
      gaps.add(String(item.skillId._id));
    }
  }

  // Add courses that teach missing skills
  if (gaps.size > 0) {
    const courses = await Course.find({
      "skills.skillId": { $in: [...gaps] },
    })
      .sort({ code: 1 })
      .limit(25)
      .populate("skills.skillId")
      .lean();

    for (const course of courses) {
      const relevant = course.skills.filter(
        (item) =>
          item.skillId &&
          gaps.has(String(item.skillId._id))
      );

      if (relevant.length === 0) continue;

      const courseKey = courseNode(graph, course);

      for (const item of relevant) {
        const key = skillNode(graph, item.skillId);
        graph.addLink(courseKey, key, "TEACHES");
      }
    }
  }

  return {
    nodes: graph.nodes,
    links: graph.links,
  };
}

// G2 — GET /graph/skill/:id
export async function skillGraph(id) {
  validateId(id);

  const skill = await Skill.findById(id)
    .populate("related.skillId")
    .populate("prerequisites")
    .lean();

  if (!skill) {
    throw new AppError(
      404,
      "NOT_FOUND",
      "Skill not found"
    );
  }

  const graph = makeGraph();
  const mainKey = skillNode(graph, skill);

  // Similar skills, available after P4 AI build
  for (const item of skill.related || []) {
    if (!item.skillId) continue;

    const key = skillNode(graph, item.skillId);
    graph.addLink(mainKey, key, "RELATED_TO");
  }

  // Prerequisite skills
  for (const prerequisite of skill.prerequisites || []) {
    const key = skillNode(graph, prerequisite);
    graph.addLink(mainKey, key, "PREREQUISITE");
  }

  const [roles, courses, projects, employees] =
    await Promise.all([
      Role.find({
        $or: [
          { "requiredSkills.skillId": skill._id },
          { "futureSkills.skillId": skill._id },
        ],
      }).lean(),

      Course.find({
        "skills.skillId": skill._id,
      }).lean(),

      Project.find({
        "requiredSkills.skillId": skill._id,
      }).lean(),

      Employee.find({
        skills: {
          $elemMatch: {
            skillId: skill._id,
            level: { $gte: 4 },
          },
        },
      })
        .sort({ code: 1 })
        .limit(15)
        .lean(),
    ]);

  // Roles that require this skill
  for (const role of roles) {
    const key = roleNode(graph, role);

    if (
      role.requiredSkills.some(
        (item) =>
          String(item.skillId) === String(skill._id)
      )
    ) {
      graph.addLink(key, mainKey, "REQUIRES");
    }

    if (
      role.futureSkills.some(
        (item) =>
          String(item.skillId) === String(skill._id)
      )
    ) {
      graph.addLink(key, mainKey, "FUTURE_REQUIRES");
    }
  }

  // Courses teaching this skill
  for (const course of courses) {
    const key = courseNode(graph, course);
    graph.addLink(key, mainKey, "TEACHES");
  }

  // Projects needing this skill
  for (const project of projects) {
    const key = projectNode(graph, project);
    graph.addLink(key, mainKey, "NEEDS");
  }

  // Up to 15 highly skilled employees
  for (const employee of employees) {
    const key = employeeNode(graph, employee);
    graph.addLink(key, mainKey, "HAS_SKILL");
  }

  return {
    nodes: graph.nodes,
    links: graph.links,
  };
}

// G3 — GET /graph/stats
export async function graphStats() {
  const [employees, skills, roles, projects, courses] =
    await Promise.all([
      Employee.find().lean(),
      Skill.find().lean(),
      Role.find().lean(),
      Project.find().lean(),
      Course.find().lean(),
    ]);

  // Full graph for statistics (not the 120-node UI cap)
  const graph = makeGraph(Infinity);

  const skillNames = new Map(
    skills.map((skill) => [
      String(skill._id),
      skill.name,
    ])
  );

  for (const skill of skills) {
    const key = skillNode(graph, skill);

    for (const prerequisite of skill.prerequisites || []) {
      const target = graph.addNode(
        "skill",
        prerequisite,
        skillNames.get(String(prerequisite)) || "Skill"
      );

      graph.addLink(key, target, "PREREQUISITE");
    }

    for (const related of skill.related || []) {
      const target = graph.addNode(
        "skill",
        related.skillId,
        skillNames.get(String(related.skillId)) || "Skill"
      );

      graph.addLink(key, target, "RELATED_TO");
    }
  }

  for (const role of roles) {
    const roleKey = roleNode(graph, role);

    for (const item of role.requiredSkills || []) {
      const target = graph.addNode(
        "skill",
        item.skillId,
        skillNames.get(String(item.skillId)) || "Skill"
      );

      graph.addLink(roleKey, target, "REQUIRES");
    }

    for (const item of role.futureSkills || []) {
      const target = graph.addNode(
        "skill",
        item.skillId,
        skillNames.get(String(item.skillId)) || "Skill"
      );

      graph.addLink(roleKey, target, "FUTURE_REQUIRES");
    }

    for (const nextRole of role.nextRoles || []) {
      // Added using the actual role document below
      const next = roles.find(
        (r) => String(r._id) === String(nextRole)
      );

      if (next) {
        const target = roleNode(graph, next);
        graph.addLink(roleKey, target, "NEXT_ROLE");
      }
    }
  }

  for (const employee of employees) {
    const empKey = employeeNode(graph, employee);

    const role = roles.find(
      (r) => String(r._id) === String(employee.roleId)
    );

    if (role) {
      graph.addLink(
        empKey,
        roleNode(graph, role),
        "HOLDS_ROLE"
      );
    }

    for (const item of employee.skills || []) {
      const key = graph.addNode(
        "skill",
        item.skillId,
        skillNames.get(String(item.skillId)) || "Skill"
      );

      graph.addLink(empKey, key, "HAS_SKILL");
    }
  }

  for (const project of projects) {
    const projectKey = projectNode(graph, project);

    for (const item of project.requiredSkills || []) {
      const key = graph.addNode(
        "skill",
        item.skillId,
        skillNames.get(String(item.skillId)) || "Skill"
      );

      graph.addLink(projectKey, key, "NEEDS");
    }

    for (const memberId of project.members || []) {
      const employee = employees.find(
        (e) => String(e._id) === String(memberId)
      );

      if (employee) {
        graph.addLink(
          employeeNode(graph, employee),
          projectKey,
          "MEMBER_OF"
        );
      }
    }
  }

  for (const course of courses) {
    const courseKey = courseNode(graph, course);

    for (const item of course.skills || []) {
      const key = graph.addNode(
        "skill",
        item.skillId,
        skillNames.get(String(item.skillId)) || "Skill"
      );

      graph.addLink(courseKey, key, "TEACHES");
    }
  }

  // Count links connected to each skill
  const counts = new Map(
    skills.map((skill) => [
      `skill:${skill._id}`,
      0,
    ])
  );

  for (const link of graph.links) {
    if (counts.has(link.source)) {
      counts.set(
        link.source,
        counts.get(link.source) + 1
      );
    }

    if (counts.has(link.target)) {
      counts.set(
        link.target,
        counts.get(link.target) + 1
      );
    }
  }

  const topSkills = skills
    .map((skill) => ({
      skillId: skill._id,
      name: skill.name,
      connections:
        counts.get(`skill:${skill._id}`) || 0,
    }))
    .sort(
      (a, b) =>
        b.connections - a.connections ||
        a.name.localeCompare(b.name)
    )
    .slice(0, 10);

  return {
    nodes: graph.nodes.length,
    links: graph.links.length,
    topSkills,
  };
}
