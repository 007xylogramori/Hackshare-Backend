import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { Team } from "../models/team.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import crypto from "crypto";
import { User } from "../models/user.model.js";
import { extractOwnerAndRepo } from "../utils/githubUrl.js";
const createTeam = asyncHandler(async (req, res) => {
  const { name } = req.body;

  if (!name || name.trim() === "") {
    throw new ApiError(400, "Team name is required");
  }

  const code = crypto.randomBytes(6).toString("hex");

  const team = new Team({
    name,
    code,
    owner: req.user._id,
    members: [{ user: req.user._id, role: "owner" }],
  });

  try {
    await team.save();
    req.user.teams.push(team._id);
    await req.user.save({ validateBeforeSave: false });
    res
      .status(201)
      .json(new ApiResponse(201, team, "Team created successfully"));
  } catch (error) {
    throw new ApiError(500, "Something went wrong while creating the team");
  }
});

const joinTeam = asyncHandler(async (req, res) => {
  const { code } = req.body;

  if (!code || code.trim() === "") {
    throw new ApiError(400, "Team code is required");
  }

  try {
    const team = await Team.findOne({ code });
    if (!team) {
      throw new ApiError(404, "Team not found");
    }

    if (team.members.some((member) => member.user.equals(req.user._id))) {
      throw new ApiError(400, "Already a member");
    }

    team.members.push({ user: req.user._id, role: "member" });
    await team.save();
    req.user.teams.push(team._id);
    await req.user.save({ validateBeforeSave: false });
    res
      .status(200)
      .json(new ApiResponse(200, team, "Joined team successfully"));
  } catch (error) {
    throw new ApiError(500, "Something went wrong while joining the team");
  }
});

const manageMembers = asyncHandler(async (req, res) => {
  const { teamId, action, memberId, role } = req.body;

  if (!teamId || !action || !memberId) {
    throw new ApiError(400, "Team ID, action, and member ID are required");
  }

  try {
    const team = await Team.findById(teamId);
    if (!team) {
      throw new ApiError(404, "Team not found");
    }

    if (!team.owner.equals(req.user._id)) {
      throw new ApiError(403, "Only the team owner can manage members");
    }

    switch (action) {
      case "add":
        if (!team.members.some((member) => member.user.equals(memberId))) {
          team.members.push({ user: memberId, role: role || "member" });
          await team.save();
          res
            .status(200)
            .json(new ApiResponse(200, team, "Member added successfully"));
        } else {
          throw new ApiError(400, "User already a member");
        }
        break;
      case "remove":
        team.members = team.members.filter(
          (member) => !member.user.equals(memberId)
        );
        await team.save();
        res
          .status(200)
          .json(new ApiResponse(200, team, "Member removed successfully"));
        break;
      case "updateRole":
        const member = team.members.find((member) =>
          member.user.equals(memberId)
        );
        if (member) {
          member.role = role;
          await team.save();
          res
            .status(200)
            .json(
              new ApiResponse(200, team, "Member role updated successfully")
            );
        } else {
          throw new ApiError(404, "Member not found");
        }
        break;
      default:
        throw new ApiError(400, "Invalid action");
    }
  } catch (error) {
    throw new ApiError(
      500,
      error.message || "Something went wrong while managing team members"
    );
  }
});

const getTeams = asyncHandler(async (req, res) => {
  try {
    const teams = await Team.find({ "members.user": req.user._id }).populate(
      "owner",
      "username email fullName"
    ); 

    const teamCount = teams.length;

    res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { teams, count: teamCount },
          "Teams fetched successfully"
        )
      );
  } catch (error) {
    throw new ApiError(500, "Something went wrong while fetching teams");
  }
});

const getTeamDetails = asyncHandler(async (req, res) => {
  const teamId = req.params.teamId || req.query.teamId;

  if (!teamId) {
    throw new ApiError(400, "Team ID is required");
  }

  try {
    const team = await Team.findById(teamId).populate(
      "members.user",
      "username email fullName"
    );
    if (!team) {
      throw new ApiError(404, "Team not found");
    }
    res
      .status(200)
      .json(new ApiResponse(200, team, "Team details fetched successfully"));
  } catch (error) {
    throw new ApiError(500, "Something went wrong while fetching team details");
  }
});

const deleteTeam = asyncHandler(async (req, res) => {
  const teamId = req.params.teamId;

  if (!teamId) {
    throw new ApiError(400, "Team ID is required");
  }
  try {
    const team = await Team.findById(teamId);
    if (!team) {
      throw new ApiError(404, "Team not found");
    }

    if (!team.owner.equals(req.user._id)) {
      throw new ApiError(403, "Only the team owner can delete the team");
    }

    const updateResult = await User.updateMany(
      { _id: { $in: team.members.map((member) => member.user) } },
      { $pull: { teams: team._id } }
    );
    console.log(updateResult.ok, "users deleted");
    await Team.findByIdAndDelete(teamId).then(() => {
      console.log("team deleted");
    });

    res.status(200).json(new ApiResponse(200, {}, "Team deleted successfully"));
  } catch (error) {
    console.error("Error deleting team:", error);
    throw new ApiError(500, "Something went wrong while deleting the team");
  }
});

const addGithubRepo = asyncHandler(async (req, res) => {
  const { teamId, repoUrl } = req.body;

  if (!teamId || !repoUrl) {
    throw new ApiError(400, "Team ID and repository URL are required");
  }

  try {
    const { owner, repoName } = extractOwnerAndRepo(repoUrl);
    console.log(owner, repoName);
    const team = await Team.findById(teamId);
    if (!team) {
      throw new ApiError(404, "Team not found");
    }

    if (!team.owner.equals(req.user._id)) {
      throw new ApiError(403, "Only the team owner can add repositories");
    }

    const repo = { name: repoName, url: repoUrl };

    team.githubRepos.push(repo);
    await team.save();

    res
      .status(200)
      .json(new ApiResponse(200, team, "Repository added successfully"));
  } catch (error) {
    throw new ApiError(500, "Something went wrong while adding the repository");
  }
});

export {
  createTeam,
  joinTeam,
  manageMembers,
  getTeams,
  getTeamDetails,
  deleteTeam,
  addGithubRepo,
};
