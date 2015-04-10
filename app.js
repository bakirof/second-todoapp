// Collection to keep the todos
Todos = new Meteor.Collection('todos');
var postsArray, cnv;
// JS code for the client (browser)
if (Meteor.isClient) {
    Template.todoapp.getCnv = function () {
        Meteor.defer(function () {
            cnv = document.getElementById('cnv').getContext('2d');
            cnv.lineWidth = 10;
            postsArray = Todos.find().fetch();
            cnv.clearRect(0, 0, 1000, 1000);
            cnv.beginPath();
            cnv.moveTo(0, 0);
            cnv.strokeStyle = "#8FA4E4";
            postsArray.forEach(function (key) {
                cnv.lineTo(key.x, key.y);
                cnv.moveTo(key.x, key.y);
                cnv.stroke();
            });
        });
    };
    // Session var to keep current filter type ("all", "active", "completed")
    Session.set('filter', 'all');

    // Session var to keep todo which is currently in editing mode, if any
    Session.set('editing_todo', null);

    // Set up filter types and their mongo db selectors
    var filter_selections = {
        all: {},
        active: {completed: false},
        completed: {completed: true}
    };

    // Get selector types as array
    var filters = _.keys(filter_selections);

    // Bind route handlers to filter types
    var routes = {};
    _.each(filters, function (filter) {
        routes['/' + filter] = function () {
            Session.set('filter', filter);
        };
    });

    // Initialize router with routes
    var router = Router(routes);
    router.init();

    /////////////////////////////////////////////////////////////////////////
    // The following two functions are taken from the official Meteor
    // "Todos" example
    // The original code can be viewed at: https://github.com/meteor/meteor
    /////////////////////////////////////////////////////////////////////////

    // Returns an event_map key for attaching "ok/cancel" events to
    // a text input (given by selector)
    var okcancel_events = function (selector) {
        return 'keyup ' + selector + ', keydown ' + selector + ', focusout ' + selector;
    };

    // Creates an event handler for interpreting "escape", "return", and "blur"
    // on a text field and calling "ok" or "cancel" callbacks.
    var make_okcancel_handler = function (options) {
        var ok = options.ok || function () {
            };
        var cancel = options.cancel || function () {
            };

        return function (evt) {
            if (evt.type === 'keydown' && evt.which === 27) {
                // escape = cancel
                cancel.call(this, evt);

            } else if (evt.type === 'keyup' && evt.which === 13 ||
                evt.type === 'focusout') {
                // blur/return/enter = ok/submit if non-empty
                var value = String(evt.target.value || '');
                if (value) {
                    ok.call(this, value, evt);
                } else {
                    cancel.call(this, evt);
                }
            }
        };
    };

    // Some helpers

    // Get the number of todos completed
    var todos_completed_helper = function () {
        return Todos.find({completed: true}).count();
    };

    // Get the number of todos not completed
    var todos_not_completed_helper = function () {
        return Todos.find({completed: false}).count();
    };

    ////
    // Logic for the 'todoapp' partial which represents the whole app
    ////

    // Helper to get the number of todos
    Template.todoapp.todos = function () {
        return Todos.find().count();
    };
    Template.todoapp.helpers({
        todos: function () {
            Template.todoapp.getCnv();
            return Todos.find().count();
        }
    });

    Template.todoapp.events = {};

    // Register key events for adding new todo
    Template.todoapp.events[okcancel_events('#new-todo')] =
        make_okcancel_handler({
            ok: function (title, evt) {
                var all = title.split(' ');
                var x = all[0];
                var y = all[1];
                console.log();
                Todos.insert({
                    x: x,
                    y: y,
                    completed: false,
                    created_at: new Date().getTime()
                });
                evt.target.value = '';
            }
        });

    ////
    // Logic for the 'main' partial which wraps the actual todo list
    ////

    // Get the todos considering the current filter type

    Template.main.helpers({
        todos: function () {
            return Todos.find(filter_selections[Session.get('filter')], {sort: {created_at: 1}})
        },
        todos_not_completed: todos_not_completed_helper
    });

    // Register click event for toggling complete/not complete button
    Template.main.events = {
        'click input#toggle-all': function (evt) {
            var completed = true;
            if (!Todos.find({completed: false}).count()) {
                completed = false;
            }
            Todos.find({}).forEach(function (todo) {
                Todos.update({'_id': todo._id}, {$set: {completed: completed}});
            });
        }
    };

    ////
    // Logic for the 'todo' partial representing a todo
    ////

    // True of current todo is completed, false otherwise

    Template.todo.helpers({
        todo_completed: function () {
            return this.completed;
        },
        todo_editing: function () {
            return Session.equals('editing_todo', this._id);
        }
    });

    // Register events for toggling todo's state, editing mode and destroying a todo
    Template.todo.events = {
        'click input.toggle': function () {
            Todos.update(this._id, {$set: {completed: !this.completed}});
        },
        'dblclick label': function () {
            Session.set('editing_todo', this._id);
        },
        'click button.destroy': function () {
            Todos.remove(this._id);
        }
    };

    // Register key events for updating title of an existing todo
    Template.todo.events[okcancel_events('li.editing input.edit')] =
        make_okcancel_handler({
            ok: function (value) {
                Session.set('editing_todo', null);
                var all = value.split(' ');
                var x = all[0];
                var y = all[1];
                console.log();
                Todos.update(this._id, {
                    $set: {
                        x: x,
                        y: y
                    }
                });
                Template.todoapp.getCnv();
            },
            cancel: function () {
                Session.set('editing_todo', null);
                Todos.remove(this._id);
            }
        });

    ////
    // Logic for the 'footer' partial
    ////

    Template.footer.helpers({
        todos_one_not_completed: function () {
            return Todos.find({completed: false}).count() == 1;
        },
        todos_not_completed: todos_not_completed_helper,
        todos_completed: todos_completed_helper,
        filters: filters,
        filter_selected: function (type) {
            return Session.equals('filter', type);
        }
    });

    // Register click events for clearing completed todos
    Template.footer.events = {
        'click button#clear-completed': function () {
            Meteor.call('clearCompleted');
        }
    };
}

//Publish and subscribe setting
if (Meteor.isServer) {
    Meteor.publish('todos', function () {
        return Todos.find();
    });
}

if (Meteor.isClient) {
    Meteor.subscribe('todos');
}

//Allow users to write directly to this collection from client code, subject to limitations you define.
if (Meteor.isServer) {
    Todos.allow({
        insert: function () {
            return true;
        },
        update: function () {
            return true;
        },
        remove: function () {
            return true;
        }
    });
}

//Defines functions that can be invoked over the network by clients.
Meteor.methods({
    clearCompleted: function () {
        Todos.remove({completed: true});
    }
});