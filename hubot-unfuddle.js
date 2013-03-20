(function() {
  var Unfuddle, Util;

  Util = require("util");

  Unfuddle = require('unfuddle');

  module.exports = function(robot) {
    var match_urls, password, projects, request_ticket_info, subdomain, ticket_info, unf, user;

    subdomain = process.env.HUBOT_UNFUDDLE_SUBDOMAIN;
    user = process.env.HUBOT_UNFUDDLE_USER;
    password = process.env.HUBOT_UNFUDDLE_PASSWORD;
    projects = {};
    robot.brain.on('loaded', function() {
      robot.brain.data.unfuddle = robot.brain.data.unfuddle || {
        projects: {}
      };
      projects = robot.brain.data.unfuddle.projects;
      return robot.logger.info("Unfuddle projects initialized.");
    });
    unf = new Unfuddle(subdomain, user, password);
    ticket_info = function(ticket) {
      return ("#" + ticket.number + ", " + ticket.summary + " ") + ("(http://" + subdomain + ".unfuddle.com/projects/" + ticket.project_id + "/tickets/by_number/" + ticket.number + ")");
    };
    match_urls = new RegExp("https://" + subdomain + ".unfuddle.com(?:/a#)?/projects/(\\d+)/tickets/by_number/(\\d+)", "ig");
    request_ticket_info = function(response) {
      var error, project_id, success, ticket_num;

      project_id = response.match[1];
      ticket_num = response.match[2];
      success = function(ticket) {
        return response.send(ticket_info(ticket));
      };
      error = function(err) {
        robot.logger.error("Error loading ticket. Details: " + err);
        return response.send("I can't seem to find that ticket.");
      };
      return unf.ticket(project_id, ticket_num).then(success, error);
    };
    robot.respond(/(\w+)#(\d+)/, request_ticket_info);
    robot.hear(match_urls, function(response) {
      return response.match.forEach(function(m) {
        response.match = m.match(new RegExp(match_urls.source, 'i'));
        return request_ticket_info(response);
      });
    });
    robot.hear(/(?:^|\s)#(\d+)/gi, function(response) {
      var error, get_ticket, num, room, success, _i, _len, _ref, _results;

      room = response.envelope.room;
      success = function(ticket) {
        return response.send(ticket_info(ticket));
      };
      error = function(err) {
        robot.logger.error("(#<ticket.number>): Details: " + err);
        return response.send("I can't find that ticket.");
      };
      get_ticket = function(project, num) {
        return unf.ticket(project.id, +num).then(success, error);
      };
      if (projects[room]) {
        _ref = response.match;
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          num = _ref[_i];
          _results.push(get_ticket(projects[room], num.trim().substr(1)));
        }
        return _results;
      }
    });
    robot.respond(/(?:^|\s)#(\d+)/gi, function(response) {
      var error, get_ticket, num, room, success, _i, _len, _ref, _results;

      room = response.envelope.room;
      success = function(ticket) {
        return response.send(ticket_info(ticket));
      };
      error = function(err) {
        robot.logger.error("(@hubot #<ticket.number>): Details: " + err);
        return response.send("I can't find that ticket.");
      };
      get_ticket = function(project, num) {
        return unf.ticket(project.id, +num).then(success, error);
      };
      if (!projects[room]) {
        return response.send("There is no project associated with this room. Please specify a project.");
      } else {
        _ref = response.match;
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          num = _ref[_i];
          _results.push(get_ticket(projects[room], num.trim().substr(1)));
        }
        return _results;
      }
    });
    return robot.respond(/use the (\w+) unfuddle project$/, function(response) {
      var error, room, success;

      room = response.envelope.room;
      success = function(project) {
        projects[room] = project;
        return response.send("I have associated the " + project.short_name + " (" + project.id + ") project with this room.");
      };
      error = function(err) {
        robot.logger.error("Details: " + err + ".");
        return response.send("I can't do that.");
      };
      return unf.projectByShortName(response.match[1]).then(success, error);
    });
  };

}).call(this);
