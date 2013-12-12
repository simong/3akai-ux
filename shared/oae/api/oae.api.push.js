/*!
 * Copyright 2013 Apereo Foundation (AF) Licensed under the
 * Educational Community License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License. You may
 * obtain a copy of the License at
 *
 *     http://opensource.org/licenses/ECL-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an "AS IS"
 * BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express
 * or implied. See the License for the specific language governing
 * permissions and limitations under the License.
 */

define(['exports', 'jquery', 'underscore', 'oae.api.util', 'sockjs'], function(exports, $, _, utilAPI) {

    // Constant that TODO
    var AGGREGATION_RULES = {
        'content-create': ['actor'],
        'content-share': ['actor', 'target']
    }

    // Variable that keeps track of whether or not the websocket has been
    // initialized, connected and authenticated successfully
    var connected = false;

    // Variable that keeps track of all messages that need to be sent over the
    // websocket, but came in whilst the websocket connection wasn't established yet.
    // Once the connection is established, all of these message will be sent over
    var deferredMessages = [];

    // Variable that keeps track of the acknowledgement callback functions for each of the
    // messages that have been sent over the websocket. As websockets are asynchronous, we
    // have to keep track of this until a response has been received for a message as we can't
    // rely on the order of the responses coming in. Once an acknowledgement for a message has
    // come in, its acknowledgement callback function will be removed from this map
    var acknowledgementCallbacks = {};

    // Variable that keeps track of the message callback functions that have registered for messages
    // on a specific channel with a specific stream type. When such a message comes in, all of these
    // message callback functions need to be called.
    // The message callbacks for the subscriptions will be stored in the following way:
    //
    //   {
    //      '<channel>': {
    //          '<streamType>': [
    //              <messageCallback1>,
    //              <messageCallback2>
    //          ],
    //          ...
    //      },
    //      ...
    //   }
    var subscriptions = {};

    // TODO
    var aggregates = {};

    /**
     * Initialize all push notification functionality by establishing the websocket connection
     * and authenticating. SockJS is used to provide a cross-browser and cross-domain communication
     * channel between the browser and the server (@see https://github.com/sockjs)
     * TODO: Document that activities are always returned
     *
     * @param  {Boolean}    anon          Whether or not the user is currently authenticated
     * @param  {Function}   callback      Standard callback function
     * @param  {Object}     callback.err  Error object containing error code and message
     * @api private
     */
    var init = exports.init = function(anon, callback) {
        // Push notifications are only enabled for authenticated users
        if (anon) {
            return callback();
        }

        // Set up the websocket that will be used for the push notifications
        sockjs = new SockJS('/api/push', {
            'protocols_whitelist': ['websocket']
        });

        // Bind the event handlers that will be called when the websocket
        // connection has been established and when new incoming messages arrive
        sockjs.onopen = authenticateSocket;
        sockjs.onmessage = incomingMessage;

        callback();
    };

    /**
     * Function that is called when the websocket connection has been established successfully.
     * The websocket is authenticated and any messages that were received before the connection
     * was established are submitted over the websocket.
     *
     * @throws {Error}                     Error thrown when the websocket could not be authenticated
     * @api private
     */
    var authenticateSocket = function() {
        // Get the me object for the current user
        var me = require('oae.core').data.me;

        // Authenticate the websocket
        sendMessage('authentication', {'userId': me.id, 'tenantAlias': me.tenant.alias, 'signature': me.signature }, function(err) {
            if (err) {
                throw new Error('Could not authenticate the websocket')
            }

            // Inidicated that the connection and authentication was successful
            connected = true;

            _.each(deferredMessages, function(message) {
                sendMessage(message.name, message.payload, message.callback);
            });
        });
    };

    /**
     * Function that is called when a new incoming message arrives over the established websocket.
     * These can either be acknowledgement messages following a message sent by the client, or actual
     * push notifications from the server.
     *
     * @param  {Object}         ev        Received SockJS event
     * @throws {Error}                    Error thrown when the incoming message could not be parsed
     */
    var incomingMessage = function(ev) {
        // Parse the incoming message
        var message = null;
        try {
            message = JSON.parse(ev.data);
        } catch (err) {
            throw new Error('Could not parse incoming websocket message');
        }
        console.log(message);

        // The message is a proper push notification. In this case, we notify all places
        // that have subscribed to the channel the event was sent over and the associated stream type
        if (message.resourceId && message.streamType) {

            // TODO
            // Aggregate content creation / content sharing / link adding / link sharing
            var activityType = message.activity['oae:activityType'];
            if (activityType && aggregationRules[activityType]) {
                aggregateMessages(message);
            } else {
                notifySubscribers(message);
            }

        // The message is an acknowledgement message. In this case, the original message's
        // acknowledgement callback function is executed
        } else {
            if (acknowledgementCallbacks[message.id]) {
                acknowledgementCallbacks[message.id](message);
            }
        }
    };

    /**
     * TODO
     */
    var aggregateMessages = function(message) {
        // Check if there already is an active aggregate
        var activityType = message.activity['oae:activityType'];
        aggregates[activityType] = aggregates[activityType] || {};

        // TOOD
        var aggregateKey = [];
        _.each(aggregationRules[activityType], function(aggregationRule) {
            aggregateKey.push(message.activity[aggregationRule]['oae:id']);
        });
        aggregateKey = aggregateKey.join('#');

        // TODO
        if (aggregates[activityType][aggregateKey]) {
            clearTimeout(aggregates[activityType][aggregateKey].timeout);

            var previousMessage = aggregates[activityType][aggregateKey].message;
            console.log(aggregates[activityType][aggregateKey]);
            var aggregateField = _.find(['actor', 'object', 'target'], function(type) {
                return !_.contains(aggregationRules[activityType], type);
            });

            // TODO
            if (previousMessage.activity[aggregateField]['oae:collection']) {
                previousMessage.activity[aggregateField]['oae:collection'].push(message.activity[aggregateField]);
            // TODO
            } else {
                previousMessage.activity[aggregateField] = {
                    'oae:collection': [previousMessage.activity[aggregateField], message.activity[aggregateField]],
                    'objectType': 'collection'
                };
            }
            // TODO
            previousMessage.activity.published = message.activity.published;

            message = previousMessage;
        }

        // TODO
        aggregates[activityType][aggregateKey] = {};
        aggregates[activityType][aggregateKey].message = message;
        aggregates[activityType][aggregateKey].timeout = setTimeout(function() {
            notifySubscribers(aggregates[activityType][aggregateKey].message);
            //delete aggregates[activityType][aggregateKey];
        }, 1000);
    };

    /**
     * Send a new message over the established websocket
     *
     * @param  {String}     name                Name of the message identifying the type of message
     * @param  {Object}     payload             Additional data that needs to be sent along with the message
     * @param  {Function}   callback            Standard callback function
     * @param  {Object}     callback.err        Error object containing error code and message
     * @param  {Object}     callback.payload    The payload of the received response
     * @api private
     */
    var sendMessage = function(name, payload, callback) {
        // Construct the message object
        var message = {
            'id': utilAPI.generateId(),
            'name': name,
            'payload': payload
        }

        // Store a reference to the function that will be called when the response
        // to the message has been received
        acknowledgementCallbacks[message.id] = function(responseMessage) {
            callback(responseMessage.error, responseMessage.payload);
            // Remove the reference now that the callback has been called
            delete acknowledgementCallbacks[message.id];
        };

        // Send the message over the websocket
        sockjs.send(JSON.stringify(message));
    };

    /**
     * Subscribe to all of the message on a speific channel for a specific stream type
     *
     * @param  {String}     channel             Id of the channel to subscribe to. Usually, this will be a resource id (e.g. user, group, content, discussion)
     * @param  {String}     streamType          Name of the stream type to subscribe to (e.g. `activity`, `message`)
     * @param  {String}     token               Token used to authorize the subscription. This token will be available on the entity that represents the channel that's being subscribed to
     * @param  {Function}   messageCallback     Function executed when a message on the provided channel and of the provided stream type arrives
     * @param  {Function}   [callback]          Standard callback function
     * @param  {Object}     [callback.err]      Error object containing error code and message
     */
    var subscribe = exports.subscribe = function(channel, streamType, token, messageCallback, callback) {
        // Set a default callback function in case no callback function has been provided
        callback = callback || function() {};

        // Check if there is already a subscription for the provided channel and stream type.
        // If there is, we just add the message callback to the list of callback function to call when
        // such a message comes in
        if (subscriptions[channel] && subscriptions[channel][streamType]) {
            subscriptions[channel][streamType].push(messageCallback);
            return callback();
        }

        // Register the message callback function that should be called when a message for
        // the provided channel and stream type comes in
        subscriptions[channel] = subscriptions[channel] || {};
        subscriptions[channel][streamType] = [messageCallback];

        // Construct the subscription request
        var name = 'subscribe';
        var payload = {
            'stream': {
                'resourceId': channel,
                'activityStreamId': streamType
            },
            'token': token
        };

        // If the websocket has not been established yet, the subscription is queued until
        // it has been established
        if (!connected) {
            deferredMessages.push({'name': name, 'payload': payload, 'callback': callback});
        // Subscribe straight away when the websocket has already been successfully established
        } else {
            sendMessage(name, payload, callback);
        }
    };

    /**
     * TODO
     */
    var notifySubscribers = function(message) {
        if (subscriptions[message.resourceId] && subscriptions[message.resourceId][message.streamType]) {
            _.each(subscriptions[message.resourceId][message.streamType], function(messageCallback) {
                messageCallback(message.activity);
            });
        }
    };

});
