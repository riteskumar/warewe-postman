"use client";

import { useState, useEffect, useRef } from "react";

interface Header {
  key: string;
  value: string;
}
interface RequestData {
  method: string;
  url: string;
  headers: Header[];
  body: string;
  timestamp: number;
}
interface ResponseData {
  status: number;
  statusText: string;
  headers: { [key: string]: string };
  data: any;
  durationMs?: number;
}

const Home = () => {
  const [method, setMethod] = useState("GET");
  const [url, setUrl] = useState("");
  const [requestBody, setRequestBody] = useState("");
  const [response, setResponse] = useState<ResponseData | null>(null);
  const [responseTab, setResponseTab] = useState("body");
  const [activeTab, setActiveTab] = useState("body");
  const [isLoading, setIsLoading] = useState(false);
  const [headers, setHeaders] = useState<Header[]>([{ key: "", value: "" }]);
  const [history, setHistory] = useState<RequestData[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [showDemoDropdown, setShowDemoDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);


  const itemsPerPage = 10;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = history.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(history.length / itemsPerPage);
  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  const getStatusMessage = (status: number) => {
    const messages: { [key: number]: string } = {
      200: "OK",
      201: "Created",
      204: "No Content",
      400: "Bad Request",
      401: "Unauthorized",
      403: "Forbidden",
      404: "Not Found",
      500: "Internal Server Error",
    };
    return messages[status] || "Unknown Status";
  };
  useEffect(() => {
    const savedHistory = localStorage.getItem("requestHistory");
    if (savedHistory) {
      setHistory(JSON.parse(savedHistory));
    }
  }, []);
  useEffect(() => {
    localStorage.setItem("requestHistory", JSON.stringify(history));
  }, [history]);
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowDemoDropdown(false);
      }
    };
  
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const saveToHistory = () => {
    const requestData: RequestData = {
      method,
      url,
      headers: headers.filter((h) => h.key && h.value),
      body: requestBody,
      timestamp: Date.now(),
    };
    const isDuplicate = history.some(
      (item) =>
        item.url === requestData.url && item.method === requestData.method
    );

    if (!isDuplicate) {
      const newHistory = [requestData, ...history].slice(0, 20);
      setHistory(newHistory);
    }
  };
  const loadFromHistory = (item: RequestData) => {
    setMethod(item.method);
    setUrl(item.url);
    setRequestBody(item.body);
    setHeaders(item.headers.length ? item.headers : [{ key: "", value: "" }]);
    setShowHistory(false);
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem("requestHistory");
  };

  const addHeader = () => {
    setHeaders([...headers, { key: "", value: "" }]);
  };
  console.log(response);

  const updateHeader = (
    index: number,
    field: "key" | "value",
    value: string
  ) => {
    const newHeaders = [...headers];
    newHeaders[index][field] = value;
    setHeaders(newHeaders);
  };

  const removeHeader = (index: number) => {
    setHeaders(headers.filter((_, i) => i !== index));
  };
  const validateRequest = (): boolean => {
    setError(null);

    if (!url.trim()) {
      setError("URL cannot be empty");
      return false;
    }

    try {
      new URL(url);
    } catch (e) {
      setError("Invalid URL format");
      return false;
    }

    if (method !== "GET" && method !== "DELETE" && !requestBody.trim()) {
      setError(`Request body is required for ${method} requests`);
      return false;
    }

    return true;
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateRequest()) {
      return;
    }
    setIsLoading(true);

    const start = performance.now();
    try {
      const headerObject = headers.reduce<{ [key: string]: string }>(
        (acc, { key, value }) => {
          if (key && value) acc[key] = value;
          return acc;
        },
        { "Content-Type": "application/json" }
      );

      const options: RequestInit = {
        method,
        headers: headerObject,
      };

      if (method !== "GET" && method !== "DELETE" && requestBody) {
        options.body = requestBody;
      }

      const res = await fetch(url, options);
      const data = await res.json();
      const end = performance.now();
      const durationMs = Math.round(end - start);

      const responseHeaders: { [key: string]: string } = {};
      res.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });
      const responseData = {
        status: res.status,
        statusText: res.statusText || getStatusMessage(res.status),
        headers: responseHeaders,
        data,
        durationMs,
      };
      setResponse(responseData);
      saveToHistory();
    } catch (error) {
      const end = performance.now();
      const durationMs = Math.round(end - start);
      let errorMessage = "Failed to fetch data";
      if (
        error instanceof TypeError &&
        error.message.includes("Failed to fetch")
      ) {
        errorMessage = "Network error: Unable to connect to the server";
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      setResponse({
        status: 0,
        statusText: "Error",
        headers: {},
        data: { error: errorMessage },
        durationMs,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className={`${"main"} ${showHistory ? "mainWithSidebar" : ""}`}>
      <div className="appHeader">
        <h1 className="appTitle">Warewe Consultancy - POSTMAN</h1>
        <button
          className="historyButton"
          onClick={() => {
            setShowHistory(!showHistory);
            setCurrentPage(1);
          }}
        >
          {showHistory ? "Hide History" : "Show History"}
        </button>
      </div>
      {showHistory && (
        <div className="historyPanel">
          <div className="historyHeader">
            <h2>Request History</h2>
            <button onClick={clearHistory} className="clearHistoryButton">
              Clear All
            </button>
          </div>
          {history.length === 0 ? (
            <p className="noHistory">No request history available</p>
          ) : (
            <>
              <div className="historyList">
                {currentItems.map((item, index) => (
                  <div
                    key={index}
                    className="historyItem"
                    onClick={() => loadFromHistory(item)}
                  >
                    <span
                      className={`historyMethod ${item.method.toLowerCase()}`}
                    >
                      {item.method}
                    </span>
                    <span className="historyUrl">{item.url}</span>
                    <span className="historyTime">
                      {new Date(item.timestamp).toLocaleString("en-GB")}
                    </span>
                  </div>
                ))}
              </div>

              {totalPages > 1 && (
                <div className="pagination">
                  <button
                    onClick={() => paginate(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="paginationButton"
                  >
                    &laquo;
                  </button>

                  <span className="paginationInfo">
                    Page {currentPage} of {totalPages}
                  </span>

                  <button
                    onClick={() => paginate(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="paginationButton"
                  >
                    &raquo;
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="requestForm">
        {error && <div className="errorMessage">{error}</div>}
        <div className="requestHeader">
          <select
            className="methodSelect"
            value={method}
            onChange={(e) => setMethod(e.target.value)}
          >
            <option value="GET">GET</option>
            <option value="POST">POST</option>
            <option value="PUT">PUT</option>
            <option value="DELETE">DELETE</option>
          </select>
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Enter URL"
            className="urlInput"
          />
          <button type="submit" className="sendButton" disabled={isLoading}>
            {isLoading ? "Sending..." : "Send"}
          </button>
        </div>

        <div className="tabs">
          <button
            type="button"
            className={`${"tab"} ${activeTab === "body" ? "tabActive" : ""}`}
            onClick={() => setActiveTab("body")}
          >
            Body
          </button>
          <button
            type="button"
            className={`${"tab"} ${activeTab === "headers" ? "tabActive" : ""}`}
            onClick={() => setActiveTab("headers")}
          >
            Headers
          </button>
        </div>

        {activeTab === "body" && method !== "GET" && method !== "DELETE" && (
          <div className="requestBody">
            <textarea
              className="requestBodyInput"
              value={requestBody}
              onChange={(e) => setRequestBody(e.target.value)}
              placeholder="Enter request body (JSON)"
            />
          </div>
        )}

        {activeTab === "headers" && (
          <div className="headersSection">
            {headers.map((header, index) => (
              <div key={index} className="headerRow">
                <input
                  type="text"
                  placeholder="Header"
                  value={header.key}
                  onChange={(e) => updateHeader(index, "key", e.target.value)}
                  className="headerInput"
                />
                <input
                  type="text"
                  placeholder="Value"
                  value={header.value}
                  onChange={(e) => updateHeader(index, "value", e.target.value)}
                  className="headerInput"
                />
                <button
                  type="button"
                  onClick={() => removeHeader(index)}
                  className="removeHeaderButton"
                >
                  X
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addHeader}
              className="addHeaderButton"
            >
              Add Header
            </button>
          </div>
        )}
      </form>
     
      <div className="demoDropdownWrapper" ref={dropdownRef}>
  <button
    className="demoDropdownToggle"
    onClick={() => setShowDemoDropdown((prev) => !prev)}
  >
    Select a Demo API
  </button>

  {showDemoDropdown && (
    <ul className="demoDropdownMenu">
      <li
        onClick={() => {
          setMethod("GET");
          setUrl("https://jsonplaceholder.typicode.com/posts");
          setRequestBody("");
          setShowDemoDropdown(false);
        }}
      >
        📮 Get Posts (GET)
      </li>
      <li
        onClick={() => {
          setMethod("POST");
          setUrl("https://jsonplaceholder.typicode.com/posts");
          setRequestBody(
            JSON.stringify(
              { title: "foo", body: "bar", userId: 1 },
              null,
              2
            )
          );
          setShowDemoDropdown(false);
        }}
      >
        📝 Create Post (POST)
      </li>
      <li
        onClick={() => {
          setMethod("PUT");
          setUrl("https://jsonplaceholder.typicode.com/todos/1");
          setRequestBody(
            JSON.stringify(
              { id: 1, title: "updated todo", completed: true },
              null,
              2
            )
          );
          setShowDemoDropdown(false);
        }}
      >
        ✅ Update Todo (PUT)
      </li>
      <li
        onClick={() => {
          setMethod("DELETE");
          setUrl("https://fakestoreapi.com/products/1");
          setRequestBody("");
          setShowDemoDropdown(false);
        }}
      >
        🗑️ Delete Product (DELETE)
      </li>
    </ul>
  )}
</div>

      {response && (
        <div className="responseSection">
          <div className="responseStatus">
            <span
              className={`statusCode status${Math.floor(
                response.status / 100
              )}xx`}
            >
              {response.status}
              {" " + response.statusText}
            </span>
            {/* <span className="statusText">{response.statusText}</span> */}
            {response.durationMs && (
              <span className="duration">{response.durationMs}ms</span>
            )}
          </div>

          <div className="responseTabs">
            <button
              className={`${"responseTab"} ${
                responseTab === "body" ? "responseTabActive" : ""
              }`}
              onClick={() => setResponseTab("body")}
            >
              Body
            </button>
            <button
              className={`${"responseTab"} ${
                responseTab === "headers" ? "responseTabActive" : ""
              }`}
              onClick={() => setResponseTab("headers")}
            >
              Headers
            </button>
          </div>

          {responseTab === "body" && (
            <pre className="responseBody">
              {JSON.stringify(response.data, null, 2)}
            </pre>
          )}

          {responseTab === "headers" && (
            <div className="responseHeaders">
              {Object.entries(response.headers).map(([key, value]) => (
                <div key={key} className={"headerItem"}>
                  <span className={"headerKey"}>{key}:</span>
                  <span className={"headerValue"}>{value}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </main>
  );
};

export default Home;
