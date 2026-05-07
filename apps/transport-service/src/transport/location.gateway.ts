import { Logger,
  WebSocketGateway, WebSocketServer, SubscribeMessage,
  OnGatewayConnection, OnGatewayDisconnect,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";

@WebSocketGateway({ cors: { origin: "*" }, namespace: "/transport" })
export class LocationGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(LocationGateway.name);
  @WebSocketServer()
  server!: Server;

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  /** Parent joins a room for a specific trip */
  @SubscribeMessage("subscribe:trip")
  handleSubscribe(client: Socket, tripId: string) {
    client.join(`trip:${tripId}`);
    return { event: "subscribed", tripId };
  }

  @SubscribeMessage("subscribe:route")
  handleSubscribeRoute(client: Socket, routeId: string) {
    client.join(`route:${routeId}`);
    return { event: "subscribed", routeId };
  }

  /** Called by TransportService when a new GPS ping arrives */
  broadcastLocation(tripId: string, data: {
    lat: number; lng: number; speedKmh?: number; heading?: number; timestamp: Date;
  }) {
    this.server.to(`trip:${tripId}`).emit("location:update", data);
  }
}
