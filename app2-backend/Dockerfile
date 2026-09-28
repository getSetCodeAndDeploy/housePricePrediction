FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /build
COPY pom.xml .
RUN mvn -q dependency:go-offline
COPY src ./src
RUN mvn -q package -DskipTests

FROM eclipse-temurin:21-jre
WORKDIR /srv
COPY --from=build /build/target/market-analysis-0.1.0.jar app.jar
RUN useradd -r -u 10001 appuser
USER appuser
EXPOSE 8002
ENTRYPOINT ["java", "-jar", "app.jar"]
