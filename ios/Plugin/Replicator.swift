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

//    private var changeToks: [ListenerToken] = []
    
    internal var listener: ((_ data: [String: Any]) -> Void)?
    internal var listenerTok: ListenerToken?

    init(_ db: Database, url: String) {
        self.db = db
        var parsed = URL(string: url)!
        if parsed.scheme != "wss" && parsed.scheme != "ws" {
            parsed = URL(string: "wss://\(url)")!
        }
        self.endpoint = URLEndpoint(url: parsed)
    }
    
    internal func startSession(_ sessionID: String, initial: Bool = false) {
        if replicator != nil {
            replicator?.stop()
            if listenerTok != nil {
                replicator?.removeChangeListener(withToken: listenerTok!)
            }
        }
        let config = ReplicatorConfiguration(database: db.database, target: endpoint)
        // FIXME this should be controlled by the user
        config.replicatorType = .pushAndPull
        config.authenticator = SessionAuthenticator(sessionID: sessionID)
        
        // FIXME this should be controlled by the user
        config.continuous = true
        
        replicator = CouchbaseLiteSwift.Replicator(config: config)
        
        if listener != nil {
            listenerTok = replicator?.addChangeListener { (change) in
                // autounregister if the listener goes away
                if self.listener == nil {
                    self.replicator?.removeChangeListener(withToken: self.listenerTok!)
                    self.listenerTok = nil
                    return
                }
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
                self.listener?(data)
            }
        }
        replicator?.start(reset: initial)
    }

    internal func stop() {
        replicator?.stop()
    }

    deinit {
        replicator?.stop()
    }
}
