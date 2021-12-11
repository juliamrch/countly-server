const common = require('../../../api/utils/common'),
    countlyCommon = require('../../../api/lib/countly.common.js'),
    log = common.log('push:api:drill');

module.exports.drillAddPushEvents = ({uid, params, events, event}) => {
    return new Promise((res, rej) => {
        if (event === '[CLY]_push_sent') {
            common.db.collection(`push_${params.app_id}`).findOne({_id: uid, msgs: {$elemMatch: {'1': countlyCommon.getTimestampRangeQuery(params)}}}, (err, pu) => {
                if (err) {
                    rej(err);
                }
                else if (pu) {
                    let ids = pu.msgs.map(([_id]) => _id);
                    ids = ids.filter((id, i) => ids.indexOf(id) === i);

                    common.db.collection('messages').find({_id: {$in: ids}}).toArray((er, msgs) => {
                        if (er) {
                            return rej(er);
                        }

                        pu.msgs.forEach(([_id, ts]) => {
                            let m = msgs.filter(msg => msg._id.toString() === _id.toString())[0];
                            events.push({
                                _id: _id,
                                key: '[CLY]_push_sent',
                                ts: ts,
                                cd: ts,
                                c: 1,
                                s: 0,
                                dur: 0,
                                sg: {
                                    i: m,
                                    a: m ? m.auto : undefined,
                                    t: m ? m.tx : undefined,
                                },
                            });
                        });

                        res();
                    });

                    // let ids = push.msgs.map(m => m[0]);
                    // common.db.collection('messages').find({_id: {$in: ids}}).toArray((e, msgs) => {

                    // });
                }
                else {
                    res();
                }
            });
        }
        else if (event === '[CLY]_push_action') {
            events = events.filter(e => !!e.sg.i);

            let ids = events.map(e => e.sg.i);
            ids = ids.filter((id, i) => ids.indexOf(id) === i).map(common.db.ObjectID);

            common.db.collection('messages').find({_id: {$in: ids}}).toArray((err, msgs) => {
                if (err) {
                    return rej(err);
                }

                events.forEach(e => {
                    e.sg.i = msgs.filter(m => m._id.toString() === e.sg.i.toString())[0];
                });

                res();
            });
        }
    });
};

module.exports.drillPreprocessQuery = ({query, params}) => {
    if (query) {
        if (query.push) {
            if (query.push.$nin) {
                query.$and = query.push.$nin.map(tk => {
                    return {$or: [{[tk]: false}, {[tk]: {$exists: false}}]};
                });
            }
            if (query.push.$in) {
                let q = query.push.$in.map(tk => {
                    return {[tk]: true};
                });
                query.$or = q;
            }
            delete query.push;
        }

        if (query.message) {
            let mid = query.message.$in || query.message.$nin,
                not = !!query.message.$nin;

            if (!mid) {
                return;
            }

            log.d(`removing message ${JSON.stringify(query.message)} from queryObject`);
            delete query.message;

            if (params && params.qstring.method === 'user_details') {
                return new Promise((res, rej) => {
                    try {
                        mid = mid.map(common.db.ObjectID);

                        let q = {msgs: {$elemMatch: {'0': {$in: mid}}}};
                        if (not) {
                            q = {msgs: {$not: q.msgs}};
                        }
                        common.db.collection(`push_${params.app_id}`).find(q, {projection: {_id: 1}}).toArray((err, ids) => {
                            if (err) {
                                rej(err);
                            }
                            else {
                                ids = (ids || []).map(id => id._id);
                                query.uid = {$in: ids};
                                log.d(`filtered by message: uids out of ${ids.length}`);
                                res();
                            }
                        });
                    }
                    catch (e) {
                        console.log(e);
                        rej(e);
                    }
                });
            }
        }
    }
};

module.exports.drillPostprocessUids = ({uids, params}) => new Promise((res, rej) => {
    let message = params.initialQueryObject && params.initialQueryObject.message;
    if (uids.length && message) {
        log.d(`filtering ${uids.length} uids by message`);

        let q;
        if (message.$in) {
            q = {_id: {$in: uids}, msgs: {$elemMatch: {'0': {$in: message.$in.map(common.db.ObjectID)}}}};
        }
        else if (message.$nin) {
            q = {$and: [{_id: {$in: uids}}, {msgs: {$not: {$elemMatch: {'0': {$in: message.$nin.map(common.db.ObjectID)}}}}}]};
        }
        else {
            q = {_id: {$in: uids}, msgs: {$elemMatch: {'0': {$in: message.map(common.db.ObjectID)}}}};
        }

        return common.db.collection(`push_${params.app_id}`).find(q, {projection: {_id: 1}}).toArray((err, ids) => {
            if (err) {
                rej(err);
            }
            else {
                ids = (ids || []).map(id => id._id);
                log.d(`filtered by message: now ${ids.length} uids out of ${uids.length}`);
                uids.splice(0, uids.length, ...ids);
                res();
            }
        });
    }

    res();
});
