import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: {
    paddingTop: 22,
    paddingBottom: 70,
    paddingHorizontal: 24,
    fontSize: 11,
    color: "#0f172a",
    fontFamily: "Helvetica",
    backgroundColor: "#ffffff",
  },

  headerLogos: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },

  logoLeft: {
    width: 58,
    height: 58,
    objectFit: "contain",
  },

  logoRight: {
    width: 120,
    height: 48,
    objectFit: "contain",
  },

  topBar: {
    height: 8,
    backgroundColor: "#2a4f84",
    marginBottom: 24,
  },

  title: {
    textAlign: "center",
    fontSize: 26,
    fontWeight: 500,
    letterSpacing: 1,
    color: "#0f2e63",
    marginBottom: 28,
  },

  infoSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 20,
    marginBottom: 26,
  },

  leftCol: {
    width: "52%",
  },

  rightCol: {
    width: "40%",
  },

  companyLine: {
    fontSize: 11,
    textTransform: "uppercase",
    marginBottom: 2,
  },

  addressLine: {
    fontSize: 11,
    marginBottom: 2,
    lineHeight: 1.45,
  },

  email: {
    fontSize: 11,
    color: "#1d4ed8",
    marginTop: 10,
  },

  infoLine: {
    fontSize: 11,
    marginBottom: 12,
    lineHeight: 1.45,
  },

  underlineLabel: {
    fontWeight: 700,
    textDecoration: "underline",
  },

  billToTitle: {
    fontSize: 22,
    fontWeight: 700,
    marginBottom: 6,
  },

  billDivider: {
    height: 1,
    backgroundColor: "#94a3b8",
    marginBottom: 12,
  },

  billName: {
    fontSize: 11,
    textTransform: "uppercase",
    marginBottom: 10,
  },

  billEmail: {
    fontSize: 11,
    color: "#1d4ed8",
    marginBottom: 8,
  },

  billAddress: {
    fontSize: 11,
    lineHeight: 1.45,
    marginBottom: 14,
  },

  tableWrap: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#cbd5e1",
  },

  row: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#cbd5e1",
    minHeight: 38,
  },

  lastRow: {
    flexDirection: "row",
    minHeight: 38,
    backgroundColor: "#f1f5f9",
  },

  leftCell: {
    width: "50%",
    borderRightWidth: 1,
    borderRightColor: "#cbd5e1",
    paddingVertical: 10,
    paddingHorizontal: 8,
    textAlign: "center",
    fontSize: 10,
    fontWeight: 700,
  },

  rightCell: {
    width: "50%",
    paddingVertical: 10,
    paddingHorizontal: 8,
    textAlign: "center",
    fontSize: 10,
  },

  totalLabel: {
    width: "50%",
    borderRightWidth: 1,
    borderRightColor: "#cbd5e1",
    paddingVertical: 10,
    paddingHorizontal: 8,
    textAlign: "right",
    fontSize: 10,
    fontWeight: 700,
  },

  totalValue: {
    width: "50%",
    paddingVertical: 10,
    paddingHorizontal: 8,
    textAlign: "center",
    fontSize: 10,
    fontWeight: 700,
  },

  bottomBar: {
    position: "absolute",
    left: 24,
    right: 24,
    bottom: 56,
    height: 8,
    backgroundColor: "#2a4f84",
  },

  footer: {
    position: "absolute",
    left: 24,
    right: 24,
    bottom: 13,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },

  footerLeft: {
    width: "72%",
    fontSize: 9,
    color: "#183d75",
    lineHeight: 1.4,
  },

  footerRight: {
    width: "24%",
    fontSize: 9,
    color: "#183d75",
    textAlign: "right",
    fontWeight: 700,
  },
});

function safeDate(value) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "2-digit",
  });
}

function money(value) {
  return Number(value || 0).toFixed(2);
}

export default function InvoicePdfDocument({ item }) {
  const data = item || {};

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerLogos}>
          {data.logoLeftUrl ? (
            <Image src={data.logoLeftUrl} style={styles.logoLeft} />
          ) : (
            <View style={styles.logoLeft} />
          )}

          {data.logoRightUrl ? (
            <Image src={data.logoRightUrl} style={styles.logoRight} />
          ) : (
            <View style={styles.logoRight} />
          )}
        </View>

        <View style={styles.topBar} />

        <Text style={styles.title}>INVOICE</Text>

        <View style={styles.infoSection}>
          <View style={styles.leftCol}>
            <Text style={styles.companyLine}>
              UNIVERSAL TECHNOLOGY SYSTEMS
            </Text>
            <Text style={styles.companyLine}>AND ASSOCIATES LLC</Text>

            <Text style={[styles.addressLine, { marginTop: 10 }]}>
              6675 Mediterranean Dr, Suite 304,
            </Text>
            <Text style={styles.addressLine}>McKinney, TX 75072.</Text>

            <Text style={styles.email}>accounts@utasystems.com</Text>
          </View>

          <View style={styles.rightCol}>
            <Text style={styles.infoLine}>
              <Text style={styles.underlineLabel}>Invoice No: </Text>
              {data.invoiceNumber || "-"}
            </Text>

            <Text style={styles.infoLine}>
              <Text style={styles.underlineLabel}>Date: </Text>
              {safeDate(data.issueDate)}
            </Text>

            <Text style={styles.infoLine}>
              <Text style={styles.underlineLabel}>Resource Name: </Text>
              {data.employeeName || "-"}
            </Text>
          </View>
        </View>

        <Text style={styles.billToTitle}>BILL TO</Text>
        <View style={styles.billDivider} />

        <Text style={styles.billName}>{data.clientName || "-"}</Text>
        <Text style={styles.billEmail}>{data.clientEmail || "-"}</Text>
        <Text style={styles.billAddress}>{data.clientAddress || "-"}</Text>

        <View style={styles.tableWrap}>
          <View style={styles.row}>
            <Text style={styles.leftCell}>Employee/Contractor Name:</Text>
            <Text style={styles.rightCell}>{data.employeeName || "-"}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.leftCell}>Job Title:</Text>
            <Text style={styles.rightCell}>{data.jobTitle || "-"}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.leftCell}>Billing Date From:</Text>
            <Text style={styles.rightCell}>{data.billingDateFrom || "-"}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.leftCell}>Billing Date To:</Text>
            <Text style={styles.rightCell}>{data.billingDateTo || "-"}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.leftCell}>Professional Service Charges:</Text>
            <Text style={styles.rightCell}>
              ${money(data.professionalServiceCharges)}
            </Text>
          </View>

          <View style={styles.lastRow}>
            <Text style={styles.totalLabel}>TOTAL DUE:</Text>
            <Text style={styles.totalValue}>${money(data.totalDue)}</Text>
          </View>
        </View>

        <View style={styles.bottomBar} fixed />

        <View style={styles.footer} fixed>
          <View style={styles.footerLeft}>
            <Text>6675 Mediterranean Dr, Suite 304, McKinney, TX 75072</Text>
            <Text>Ph: +1 9452747148</Text>
            <Text>Email: info@utasystems.com</Text>
          </View>

          <Text style={styles.footerRight}>www.utasystems.com</Text>
        </View>
      </Page>
    </Document>
  );
}