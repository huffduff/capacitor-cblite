//
//  CBLiteReplicator.swift
//  Plugin
//
//  Created by Thomas O'Reilly on 9/16/21.
//  Copyright © 2021 Max Lynch. All rights reserved.
//

import Foundation
import CouchbaseLiteSwift

@objc internal class Replicator: NSObject {
    private let db: Database

    private let endpoint: URLEndpoint

    private var replicator: CouchbaseLiteSwift.Replicator?

    private var changeToks: [ListenerToken] = []

    init(_ db: Database, url: String) {
        self.db = db
        var parsed = URL(string: url)!
        if parsed.scheme != "wss" && parsed.scheme != "ws" {
            parsed = URL(string: "wss://\(url)")!
        }
        self.endpoint = URLEndpoint(url: parsed)
    }

    internal func setSession(sessionID: String) -> Replicator {
        if replicator != nil {
            replicator?.stop()
        }
        var config = ReplicatorConfiguration(database: db.database, target: endpoint)
        // FIXME this should be controlled by the user
        config.replicatorType = .pushAndPull
        config.authenticator = SessionAuthenticator(sessionID: sessionID)
        // FIXME this should be controlled by the user
        config.continuous = true

        replicator = CouchbaseLiteSwift.Replicator(config: config)

        // set the basic watch automatically
        return self // .watchChanges(cap)
    }

    internal func start() {
        replicator?.start()
    }

    //    // show repl changes. maybe only activate when requested?
    //    internal func watchChanges(_ cap: CAPPlugin) -> CBLiteReplicator {
    //        let tok = replicator?.addDocumentReplicationListener { (replication) in
    //            for document in replication.documents {
    //                var data: [ String: Any ] = [
    //                    "event": "change",
    //                    "_id": document.id,
    //                    "direction": replication.isPush ? "push" : "pull",
    //                ]
    //                if (document.error != nil) {
    //                    data["error"] = document.error as Any
    //                }
    //                if (document.flags.contains(.deleted)) {
    //                    data["deleted"] = true
    //                }
    //                if (document.flags.contains(.accessRemoved)) {
    //                    data["revoked"] = true
    //                }
    //                cap.notifyListeners("cblite:\(self.db.database.name):repl", data: data)
    //            }
    //        }
    //        if (tok != nil) {
    //            changeToks.append(tok!)
    //        }
    //        return self
    //    }
    //
    internal func start(_ call: @escaping ([String: Any]) -> Void) {

        let tok = replicator?.addChangeListener { (change) in
            var data: [String: Any] = [
                "name": self.db.database.name,
                "completed": change.status.progress.completed,
                "total": change.status.progress.total
            ]

            if let error = change.status.error as NSError? {
                print("� ERROR", error)
                data["error"] = error.description
                data["status"] = error.code
                if error.code == 10401 {
                    data["event"] = "unauthorized"
                }
            }
            // change
            // paused
            // active
            // error
            switch change.status.activity {
            case .connecting:
                data["event"] = "connecting"
            case .busy:
                data["event"] = "busy"
            case .stopped:
                if data["event"] == nil {
                    data["event"] = "stopped"
                }
            case .idle:
                data["event"] = "idle"
            case .offline:
                data["event"] = "offline"
            @unknown default:
                if data["error"] == nil {
                    data["error"] = "unknown error"
                }
            }
            if data["error"] != nil && data["event"] == nil {
                data["event"] = "error"
            }
            call(data)
        }
        if tok != nil {
            changeToks.append(tok!)
        }
        start()
    }

    internal func stop() {
        replicator?.stop()
    }

    deinit {
        for tok in changeToks {
            // just in case?
            replicator?.removeChangeListener(withToken: tok)
            replicator?.stop()
        }
    }
}
