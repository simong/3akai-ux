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

define(['exports', 'jquery', 'underscore', 'sockjs'], function(exports, $, _) {


    var sockjsUrl = '/api/push';
    var sockjsOptions = {
        'debug': true,
        'devel': true,
        'protocols_whitelist': ['websocket']
    };

    var sockjs = null;
    var consumers = {};

    var deferredActions = [];
    var connected = false;


    var init = exports.init = function(me, callback) {
        // Only set up a websocket for an authenticated user
        if (me.anon) {
            callback();
        }

        // Construct the websocket.
        sockjs = new SockJS(sockjsUrl, sockjsOptions);

        /**
         * Gets called when the websocket connection has been succesfully setup.
         * We need to authenticate with the backend before we do anything else.
         */
        sockjs.onopen = function()  {
            sendMessage('authentication', {'userId': me.id, 'tenantAlias': me.tenant.alias, 'signature': me.signature }, function(err) {
                if (err) {
                    return callback(err);
                }

                connected = true;

                if (deferredActions.length > 0) {
                    _.each(deferredActions, function(action) {
                        sendMessage(action.name, action.payload, action.callback);
                    });
                }

                callback();
            });
        };

        /**
         * Gets called whenever a new message is received on the websocket
         * We'll send out a custom event so this data can be consumed
         *
         * @param  {Event} e A SockJS Event.
         */
        sockjs.onmessage = function(e) {
            var msg = null;
            try {
                msg = JSON.parse(e.data);
            } catch (err) {
                console.error('Could not parse json');
                return;
            }

            console.log(msg);

            if (msg.channel) {
                $(document).trigger('push.' + msg.channel.name, msg.event);
            } else {
                $(document).trigger('websockets.internal.' + msg.id, msg);
            }
        };
    };

    /**
     * Allows you to express interest in a feed.
     */
    var subscribe = exports.subscribe = function(resourceId, activityStreamId, token, callback) {
        callback = callback || function() {};

        var name = 'subscribe';
        var payload = {
            'stream': {
                'resourceId': resourceId,
                'activityStreamId': activityStreamId
            },
            'token': token
        };

        if (!connected) {
            deferredActions.push({'name': name, 'payload': payload, 'callback': callback});
        } else {
            sendMessage(name, payload, callback);
        }
    };

    /**
     * Sends a message over the websocket
     *
     * @param  {String}   name              The name for this message
     * @param  {Object}   payload           Any other data that needs to be sent along
     * @param  {Function} callback          Function that will be called when a response is received
     * @param  {Object}   callback.err      An error object (if any)
     * @param  {Object}   callback.payload  The payload of the response (if any)
     * @api private
     */
    var sendMessage = function(name, payload, callback) {
        var id = Math.floor(Math.random()*1000000);

        // Attach an event listener that will only get called once.
        $(document).one('websockets.internal.' + id, function(ev, message) {
            if (message.error) {
                return callback(message.error);
            }

            return callback(null, message.payload);
        });

        // The data we'll be sending
        var msg = {
            'id': id,
            'name': name,
            'payload': payload
        };
        msg = JSON.stringify(msg);

        // Write out the message
        sockjs.send(msg);
    };

});
